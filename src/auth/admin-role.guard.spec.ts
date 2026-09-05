import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { LogQueryRoleGuard, LogReadRoleGuard } from './admin-role.guard';

/**
 * These cover the scoping added when /logs/query was opened to monitoring's
 * read-only principal. The endpoint returns raw log bodies, so the interesting
 * assertions are the negative ones: what a read-only caller still cannot do.
 */

const ADMIN = 'internal:logging-microservice:admin';
const READONLY = 'internal:logging-microservice:readonly';

function contextFor(query: Record<string, unknown>) {
  const request: Record<string, unknown> = {
    headers: { authorization: 'Bearer test-token' },
    query,
  };
  return {
    request,
    ctx: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as never,
  };
}

function guardWithRoles<T extends LogQueryRoleGuard | LogReadRoleGuard>(
  guard: T,
  roles: string[] | null,
): T {
  // Stand in for the auth-microservice round trip.
  (guard as unknown as { validateToken: unknown }).validateToken = async () => {
    if (roles === null) {
      throw new UnauthorizedException('Invalid bearer token');
    }
    return { roles };
  };
  return guard;
}

describe('LogQueryRoleGuard', () => {
  it('rejects a principal with no logging role at all', async () => {
    const { ctx } = contextFor({ level: 'error' });
    const guard = guardWithRoles(new LogQueryRoleGuard(), ['app:something:user']);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets a read-only principal ask what is failing', async () => {
    const { ctx } = contextFor({ level: 'error', limit: '50' });
    const guard = guardWithRoles(new LogQueryRoleGuard(), [READONLY]);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('refuses free-text search to a read-only principal', async () => {
    // `q` is the exfiltration primitive: it searches log *bodies*, which carry
    // tokens and request payloads. Opening the endpoint must not open this.
    const { ctx } = contextFor({ level: 'error', q: 'password' });
    const guard = guardWithRoles(new LogQueryRoleGuard(), [READONLY]);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a read-only principal a full log dump', async () => {
    // No level, or an info-level query, is "give me everything" rather than
    // "what is broken".
    for (const query of [{}, { level: 'info' }, { level: 'debug' }]) {
      const { ctx } = contextFor(query);
      const guard = guardWithRoles(new LogQueryRoleGuard(), [READONLY]);
      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('caps an oversized page rather than failing the request', async () => {
    // An alerting path is usually asking this question *because* something is
    // already wrong; it should not be denied over a page size.
    const { ctx, request } = contextFor({ level: 'error', limit: '100000' });
    const guard = guardWithRoles(new LogQueryRoleGuard(), [READONLY]);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(Number((request.query as Record<string, unknown>).limit)).toBe(200);
  });

  it('caps a missing or nonsense page size', async () => {
    for (const limit of [undefined, 'abc', '-5', '0']) {
      const { ctx, request } = contextFor({ level: 'error', limit });
      const guard = guardWithRoles(new LogQueryRoleGuard(), [READONLY]);
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(Number((request.query as Record<string, unknown>).limit)).toBe(200);
    }
  });

  it('leaves an admin principal completely unrestricted', async () => {
    // The scoping is about widening access safely, not about taking anything
    // away from the operators who already had it.
    const { ctx, request } = contextFor({ q: 'anything', level: 'info', limit: '5000' });
    const guard = guardWithRoles(new LogQueryRoleGuard(), [ADMIN]);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect((request.query as Record<string, unknown>).limit).toBe('5000');
  });

  it('rejects a request with no bearer token before looking at scope', async () => {
    const request = { headers: {}, query: { level: 'error' } };
    const ctx = { switchToHttp: () => ({ getRequest: () => request }) } as never;
    const guard = new LogQueryRoleGuard();
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('LogReadRoleGuard', () => {
  it('admits the read-only principal to aggregate endpoints', async () => {
    const { ctx } = contextFor({});
    const guard = guardWithRoles(new LogReadRoleGuard(), [READONLY]);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('does not apply query scoping, since it guards no raw-content endpoint', async () => {
    const { ctx } = contextFor({ q: 'anything' });
    const guard = guardWithRoles(new LogReadRoleGuard(), [READONLY]);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
