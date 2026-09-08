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
    global.fetch = jest.fn(async () => ({ ok: false })) as never;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('always requires auth — rejects unauthenticated ingest', async () => {
    await expect(new LogIngestGuard().canActivate(contextFor({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects missing bearer even if LOG_INGEST_REQUIRE_AUTH is unset or false', async () => {
    delete process.env.LOG_INGEST_REQUIRE_AUTH;
    await expect(new LogIngestGuard().canActivate(contextFor({}))).rejects.toThrow(
      UnauthorizedException,
    );

    process.env.LOG_INGEST_REQUIRE_AUTH = 'false';
    await expect(new LogIngestGuard().canActivate(contextFor({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // Regression: static LOG_INGEST_BEARER_TOKENS / JWT_TOKEN must never authorize.
  it('refuses a static bearer that is not an Auth-validated principal', async () => {
    process.env.LOG_INGEST_BEARER_TOKENS = 'expected-token';
    process.env.JWT_TOKEN = 'shared-unrelated-value';
    global.fetch = jest.fn(async () => ({ ok: false })) as never;

    await expect(
      new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer expected-token' })),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      new LogIngestGuard().canActivate(
        contextFor({ authorization: 'Bearer shared-unrelated-value' }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  describe('per-pair service principal', () => {
    const validating = (roles: string[]) =>
      jest.fn(async () => ({ ok: true, json: async () => ({ valid: true, user: { roles } }) }));

    it('accepts a principal holding the ingest role', async () => {
      global.fetch = validating(['internal:logging-microservice:ingest']) as never;

      await expect(
        new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer rs256-token' })),
      ).resolves.toBe(true);
    });

    it('accepts a principal holding the admin role', async () => {
      global.fetch = validating(['internal:logging-microservice:admin']) as never;

      await expect(
        new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer rs256-token' })),
      ).resolves.toBe(true);
    });

    it('rejects a validly-signed principal that lacks the ingest role', async () => {
      global.fetch = validating(['internal:logging-microservice:readonly']) as never;

      await expect(
        new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer rs256-token' })),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not accept global:superadmin as an ingest role', async () => {
      global.fetch = validating(['global:superadmin']) as never;

      await expect(
        new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer rs256-token' })),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('fails closed when Auth validate is unreachable', async () => {
      global.fetch = jest.fn(async () => {
        throw new Error('ECONNREFUSED');
      }) as never;

      await expect(
        new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer rs256-token' })),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  it('enforces the service allowlist before accepting credentials', async () => {
    process.env.LOG_INGEST_SERVICE_ALLOWLIST = 'orders-microservice';

    await expect(
      new LogIngestGuard().canActivate(
        contextFor({ authorization: 'Bearer anything' }, 'unknown-service'),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
