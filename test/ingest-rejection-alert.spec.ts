import { ExecutionContext } from '@nestjs/common';
import { LogIngestGuard } from '../src/auth/log-ingest.guard';

/**
 * Fail fast on rejected ingest (TASK-LOG-005 hardening).
 *
 * The 2026-07-06 lockout was invisible because the guard threw 401 and logged
 * nothing server-side. Eleven services stopped shipping and the sink stayed quiet
 * about it for six weeks. A rejected sender must be loud immediately.
 */
describe('LogIngestGuard rejection visibility', () => {
  const originalEnv = { ...process.env };
  let errorSpy: jest.SpyInstance;

  const contextFor = (body: unknown, headers: Record<string, string> = {}): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ body, headers }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.LOG_INGEST_REQUIRE_AUTH = 'true';
    process.env.LOG_INGEST_BEARER_TOKENS = 'good-token';
    delete process.env.LOG_INGEST_SERVICE_ALLOWLIST;
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    process.env = { ...originalEnv };
  });

  it('logs an error naming the service when a credential is missing', () => {
    const guard = new LogIngestGuard();

    expect(() => guard.canActivate(contextFor({ service: 'auth-microservice' }))).toThrow();

    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls.map((c) => JSON.stringify(c)).join(' ');
    expect(logged).toContain('auth-microservice');
    expect(logged).toMatch(/reject/i);
  });

  it('logs an error when a bearer token is presented but wrong', () => {
    const guard = new LogIngestGuard();

    expect(() =>
      guard.canActivate(
        contextFor({ service: 'orders-microservice' }, { authorization: 'Bearer wrong-token' }),
      ),
    ).toThrow();

    const logged = errorSpy.mock.calls.map((c) => JSON.stringify(c)).join(' ');
    expect(logged).toContain('orders-microservice');
  });

  it('never logs the presented credential value', () => {
    const guard = new LogIngestGuard();

    expect(() =>
      guard.canActivate(
        contextFor({ service: 'x' }, { authorization: 'Bearer super-secret-value' }),
      ),
    ).toThrow();

    const logged = errorSpy.mock.calls.map((c) => JSON.stringify(c)).join(' ');
    expect(logged).not.toContain('super-secret-value');
    expect(logged).not.toContain('good-token');
  });

  it('logs an error when a service is blocked by the allowlist', () => {
    process.env.LOG_INGEST_SERVICE_ALLOWLIST = 'allowed-svc';
    const guard = new LogIngestGuard();

    expect(() => guard.canActivate(contextFor({ service: 'blocked-svc' }))).toThrow();

    const logged = errorSpy.mock.calls.map((c) => JSON.stringify(c)).join(' ');
    expect(logged).toContain('blocked-svc');
  });

  it('stays silent when the credential is valid', () => {
    const guard = new LogIngestGuard();

    expect(
      guard.canActivate(contextFor({ service: 'speakasap' }, { authorization: 'Bearer good-token' })),
    ).toBe(true);

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
