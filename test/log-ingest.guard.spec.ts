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

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows unauthenticated ingest while compatibility mode is disabled', () => {
    process.env.LOG_INGEST_REQUIRE_AUTH = 'false';
    delete process.env.LOG_INGEST_BEARER_TOKENS;

    expect(new LogIngestGuard().canActivate(contextFor({}))).toBe(true);
  });

  it('requires a configured bearer token when auth is enabled', () => {
    process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
    process.env.LOG_INGEST_BEARER_TOKENS = 'expected-token';

    expect(() => new LogIngestGuard().canActivate(contextFor({}))).toThrow(UnauthorizedException);
    expect(
      new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer expected-token' })),
    ).toBe(true);
  });

  // Regression guard for the a2880693 retirement (2026-08-27). hasValidBearer()
  // used to add process.env.JWT_TOKEN to the accepted set, which made a value
  // shared by five unrelated services a valid ingest credential. Only
  // LOG_INGEST_BEARER_TOKENS may authorize ingest.
  it('does not accept JWT_TOKEN as an ingest credential', () => {
    process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
    process.env.LOG_INGEST_BEARER_TOKENS = 'expected-token';
    process.env.JWT_TOKEN = 'shared-unrelated-value';

    expect(() =>
      new LogIngestGuard().canActivate(
        contextFor({ authorization: 'Bearer shared-unrelated-value' }),
      ),
    ).toThrow(UnauthorizedException);

    // the explicitly configured token still works
    expect(
      new LogIngestGuard().canActivate(contextFor({ authorization: 'Bearer expected-token' })),
    ).toBe(true);
  });

  it('rejects ingest when JWT_TOKEN is the only credential configured', () => {
    process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
    delete process.env.LOG_INGEST_BEARER_TOKENS;
    process.env.JWT_TOKEN = 'shared-unrelated-value';

    expect(() =>
      new LogIngestGuard().canActivate(
        contextFor({ authorization: 'Bearer shared-unrelated-value' }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('enforces the service allowlist before accepting credentials', () => {
    process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
    process.env.LOG_INGEST_BEARER_TOKENS = 'expected-token';
    process.env.LOG_INGEST_SERVICE_ALLOWLIST = 'orders-microservice';

    expect(() =>
      new LogIngestGuard().canActivate(
        contextFor({ authorization: 'Bearer expected-token' }, 'unknown-service'),
      ),
    ).toThrow(ForbiddenException);
  });
});
