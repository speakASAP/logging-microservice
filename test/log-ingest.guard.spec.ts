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
