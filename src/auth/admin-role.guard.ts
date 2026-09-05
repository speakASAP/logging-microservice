import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

const REQUIRED_ADMIN_ROLES = new Set([
  'global:superadmin',
  'app:logging-microservice:admin',
  'internal:logging-microservice:admin',
]);

/**
 * Roles allowed on read-only log endpoints. Service principals that only need to
 * read summaries (monitoring's marathon panel) get `:readonly` and must not be
 * able to reach admin surfaces, so this set is checked only where it is opted in.
 */
const READ_ONLY_ROLES = new Set([
  ...REQUIRED_ADMIN_ROLES,
  'internal:logging-microservice:readonly',
]);

type AuthValidateResponse = {
  valid?: boolean;
  user?: {
    roles?: unknown;
  };
};

@Injectable()
export class AdminRoleGuard implements CanActivate {
  /**
   * Roles this guard accepts. Kept as an overridable field rather than a
   * constructor parameter: Nest's DI cannot resolve a ReadonlySet, and injecting
   * one makes the whole module fail to instantiate at boot.
   */
  protected readonly allowedRoles: ReadonlySet<string> = REQUIRED_ADMIN_ROLES;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization;

    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const user = await this.validateToken(token);
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const hasRole = roles.some(
      (role) => typeof role === 'string' && this.allowedRoles.has(role),
    );

    if (!hasRole) {
      throw new ForbiddenException('Logging admin role required');
    }

    request.user = user;
    return true;
  }

  private async validateToken(token: string): Promise<{ roles?: unknown }> {
    const authServiceUrl = (process.env.AUTH_SERVICE_URL || 'http://auth-microservice:3370').replace(/\/$/, '');

    try {
      const response = await fetch(`${authServiceUrl}/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new UnauthorizedException('Invalid bearer token');
      }

      const data = (await response.json()) as AuthValidateResponse;
      if (!data.valid || !data.user) {
        throw new UnauthorizedException('Invalid bearer token');
      }

      return data.user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Auth validation unavailable');
    }
  }
}

/**
 * Read-only variant for endpoints that expose summaries rather than raw log
 * contents. Accepts the admin roles plus `internal:logging-microservice:readonly`.
 */
@Injectable()
export class LogReadRoleGuard extends AdminRoleGuard {
  protected readonly allowedRoles: ReadonlySet<string> = READ_ONLY_ROLES;
}

/** Levels a read-only principal may query. */
const READ_ONLY_LEVELS = new Set(['error', 'warn', 'fatal']);

/** Largest page a read-only principal may pull in one request. */
const READ_ONLY_MAX_LIMIT = 200;

/**
 * Guard for `/logs/query`, the one read endpoint that returns raw log bodies.
 *
 * Monitoring needs this endpoint to see which services are erroring, and it
 * holds `internal:logging-microservice:readonly`. The obvious move is to let
 * that role through LogReadRoleGuard and stop there -- but every other endpoint
 * on that guard returns aggregates, while this one returns log *contents*, with
 * free-text search across them. Log bodies routinely carry tokens, e-mail
 * addresses and request payloads, so granting a summary-scoped principal
 * unrestricted full-text search over all logs would quietly turn a read-only
 * role into ecosystem-wide data access.
 *
 * So the role is admitted and then scoped. An admin principal is unaffected.
 * A read-only principal may ask the question monitoring actually needs -- "what
 * is failing" -- and not "show me everything you have":
 *
 *   - only error-ish levels, never a full log dump
 *   - no free-text `q`, which is the exfiltration primitive here
 *   - a bounded page size
 *
 * Enforced in the guard rather than the handler so that a future endpoint or a
 * refactor cannot accidentally route around it.
 */
@Injectable()
export class LogQueryRoleGuard extends AdminRoleGuard {
  protected readonly allowedRoles: ReadonlySet<string> = READ_ONLY_ROLES;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = await super.canActivate(context);
    if (!allowed) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const roles = Array.isArray(request.user?.roles) ? request.user.roles : [];
    const isAdmin = roles.some(
      (role: unknown) => typeof role === 'string' && REQUIRED_ADMIN_ROLES.has(role),
    );
    if (isAdmin) {
      return true;
    }

    const query = request.query ?? {};

    if (query.q !== undefined && String(query.q).length > 0) {
      throw new ForbiddenException(
        'Free-text log search requires a logging admin role',
      );
    }

    const level = String(query.level ?? '').toLowerCase();
    if (!READ_ONLY_LEVELS.has(level)) {
      throw new ForbiddenException(
        `Read-only log queries must request one of: ${[...READ_ONLY_LEVELS].join(', ')}`,
      );
    }

    // Capped rather than rejected: a caller asking for too much still gets a
    // useful answer, and an alerting path should not fail closed over a page
    // size when it is trying to report that something else is broken.
    const limit = Number(query.limit);
    if (!Number.isFinite(limit) || limit > READ_ONLY_MAX_LIMIT || limit <= 0) {
      query.limit = String(READ_ONLY_MAX_LIMIT);
      request.query = query;
    }

    return true;
  }
}
