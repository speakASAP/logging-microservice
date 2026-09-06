import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { LogIngestGuard } from '../src/auth/log-ingest.guard';

function contextFor(headers: Record<string, string | undefined>, service = 'orders-microservice') {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
        body: { service },
      }),
    }),
  } as any;
}

describe('LogIngestGuard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // The RS256 path calls POST /auth/validate. These cases cover the legacy
    // static credentials, so auth is stubbed as "no valid principal" and the
    // guard must fall through to them. Left unstubbed the suite would hit the
    // network and stop being deterministic.
    global.fetch = jest.fn(async () => ({ ok: false })) as never;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('allows unauthenticated ingest while compatibility mode is disabled', async () => {
    process.env.LOG_INGEST_REQUIRE_AUTH = 'false';
    delete process.env.LOG_INGEST_BEARER_TOKENS;

    await expect(new LogIngestGuard().canActivate(contextFor({}))).resolves.toBe(true);
  });

  it('requires a configured bearer token when auth is enabled', async () => {
    process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
    process.env.LOG_INGEST_BEARER_TOKENS = 'expected-token';

    await expect(new LogIngestGuard().canActivate(contextFor({}))).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(
      new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer expected-token' })),
    ).resolves.toBe(true);
  });

  // Regression guard for the a2880693 retirement (2026-08-27). hasValidBearer()
  // used to add process.env.JWT_TOKEN to the accepted set, which made a value
  // shared by five unrelated services a valid ingest credential. Only
  // LOG_INGEST_BEARER_TOKENS may authorize ingest.
  it('does not accept JWT_TOKEN as an ingest credential', async () => {
    process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
    process.env.LOG_INGEST_BEARER_TOKENS = 'expected-token';
    process.env.JWT_TOKEN = 'shared-unrelated-value';

    await expect(
      new LogIngestGuard().canActivate(
        contextFor({ authorization: 'Bearer shared-unrelated-value' }),
      ),
    ).rejects.toThrow(UnauthorizedException);

    // the explicitly configured token still works
    await expect(
      new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer expected-token' })),
    ).resolves.toBe(true);
  });

  it('rejects ingest when JWT_TOKEN is the only credential configured', async () => {
    process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
    delete process.env.LOG_INGEST_BEARER_TOKENS;
    process.env.JWT_TOKEN = 'shared-unrelated-value';

    await expect(
      new LogIngestGuard().canActivate(
        contextFor({ authorization: 'Bearer shared-unrelated-value' }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  // The conformant path: an Auth-issued per-pair credential carrying the ingest
  // role, per auth-microservice/docs/SERVICE_IDENTITY_CONSUMER_STANDARD.md.
  describe('per-pair service principal', () => {
    const validating = (roles: string[]) =>
      jest.fn(async () => ({ ok: true, json: async () => ({ valid: true, user: { roles } }) }));

    it('accepts a principal holding the ingest role, with no static credential configured', async () => {
      process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
      delete process.env.LOG_INGEST_BEARER_TOKENS;
      delete process.env.LOG_INGEST_API_KEYS;
      global.fetch = validating(['internal:logging-microservice:ingest']) as never;

      await expect(
        new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer rs256-token' })),
      ).resolves.toBe(true);
    });

    it('rejects a validly-signed principal that lacks the ingest role', async () => {
      process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
      delete process.env.LOG_INGEST_BEARER_TOKENS;
      delete process.env.LOG_INGEST_API_KEYS;
      global.fetch = validating(['internal:logging-microservice:readonly']) as never;

      await expect(
        new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer rs256-token' })),
      ).rejects.toThrow(UnauthorizedException);
    });

    // global:superadmin is a human role. A service token must never carry it,
    // so holding it must not buy ingest.
    it('does not accept global:superadmin as an ingest role', async () => {
      process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
      delete process.env.LOG_INGEST_BEARER_TOKENS;
      delete process.env.LOG_INGEST_API_KEYS;
      global.fetch = validating(['global:superadmin']) as never;

      await expect(
        new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer rs256-token' })),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('still refuses a static credential once the migration window is closed', async () => {
      process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
      process.env.LOG_INGEST_BEARER_TOKENS = 'expected-token';
      process.env.LOG_INGEST_ALLOW_STATIC_CREDENTIALS = 'false';

      await expect(
        new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer expected-token' })),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  it('enforces the service allowlist before accepting credentials', async () => {
    process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
    process.env.LOG_INGEST_BEARER_TOKENS = 'expected-token';
    process.env.LOG_INGEST_SERVICE_ALLOWLIST = 'orders-microservice';

    // Still thrown synchronously, before any await: an unlisted sender is
    // refused without asking auth about its credential.
    await expect(
      new LogIngestGuard().canActivate(
        contextFor({ authorization: 'Bearer expected-token' }, 'unknown-service'),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
