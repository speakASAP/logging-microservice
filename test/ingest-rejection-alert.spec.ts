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
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // These cases cover the legacy static-credential path and its rejection
    // logging, so auth is stubbed as "no valid principal" and the guard falls
    // through to it. Unstubbed, the RS256 path would reach the network.
    global.fetch = jest.fn(async () => ({ ok: false })) as never;
  });

  it('logs an error naming the service when a credential is missing', async () => {
    const guard = new LogIngestGuard();

    await expect(guard.canActivate(contextFor({ service: 'auth-microservice' }))).rejects.toThrow();

    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls.map((c) => JSON.stringify(c)).join(' ');
    expect(logged).toContain('auth-microservice');
    expect(logged).toMatch(/reject/i);
  });

  it('logs an error when a bearer token is presented but wrong', async () => {
    const guard = new LogIngestGuard();

    await expect(
      guard.canActivate(
        contextFor({ service: 'orders-microservice' }, { authorization: 'Bearer wrong-token' }),
      ),
    ).rejects.toThrow();

    const logged = errorSpy.mock.calls.map((c) => JSON.stringify(c)).join(' ');
    expect(logged).toContain('orders-microservice');
  });

  it('never logs the presented credential value', async () => {
    const guard = new LogIngestGuard();

    await expect(
      guard.canActivate(
        contextFor({ service: 'x' }, { authorization: 'Bearer super-secret-value' }),
      ),
    ).rejects.toThrow();

    const logged = errorSpy.mock.calls.map((c) => JSON.stringify(c)).join(' ');
    expect(logged).not.toContain('super-secret-value');
    expect(logged).not.toContain('good-token');
  });

  it('logs an error when a service is blocked by the allowlist', async () => {
    process.env.LOG_INGEST_SERVICE_ALLOWLIST = 'allowed-svc';
    const guard = new LogIngestGuard();

    await expect(guard.canActivate(contextFor({ service: 'blocked-svc' }))).rejects.toThrow();

    const logged = errorSpy.mock.calls.map((c) => JSON.stringify(c)).join(' ');
    expect(logged).toContain('blocked-svc');
  });

  it('stays silent when the credential is valid', async () => {
    const guard = new LogIngestGuard();

    await expect(
      guard.canActivate(contextFor({ service: 'speakasap' }, { authorization: 'Bearer good-token' })),
    ).resolves.toBe(true);

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
