import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

type RequestWithHeaders = {
  headers?: Record<string, string | string[] | undefined>;
  body?: { service?: unknown };
};

/**
 * Roles that authorize writing logs. `ingest` is the least privilege for this
 * route; `admin` is accepted because a principal already trusted to administer
 * logging is not meaningfully restrained by being refused the write.
 *
 * `global:superadmin` is deliberately absent: it is a human role, and a service
 * token must never carry it.
 */
const INGEST_ROLES: ReadonlySet<string> = new Set([
  'internal:logging-microservice:ingest',
  'internal:logging-microservice:admin',
]);

/**
 * Ingest gate for `POST /api/logs`.
 *
 * Auth-issued per-pair RS256 service credential carrying
 * `internal:logging-microservice:ingest`, per
 * `auth-microservice/docs/SERVICE_IDENTITY_CONSUMER_STANDARD.md`.
 *
 * Static shared credentials (`LOG_INGEST_API_KEYS`, `LOG_INGEST_BEARER_TOKENS`)
 * are deleted — not flag-gated. A sender without a real principal is refused.
 */
@Injectable()
export class LogIngestGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const serviceName = this.normalizeServiceName(request.body?.service);

    this.enforceServiceAllowlist(serviceName);

    if (!this.requireAuth()) {
      return true;
    }

    if (await this.hasValidServicePrincipal(request)) {
      return true;
    }

    // A rejected sender must be loud immediately. On 2026-07-06 ingest auth was
    // enforced without distributing credentials; eleven services began failing here
    // and this guard said nothing, so the outage stayed invisible for six weeks.
    // Never log the presented credential — only that one was absent or unrecognised.
    this.reportRejection(
      serviceName,
      this.hasAnyCredential(request) ? 'invalid_credential' : 'missing_credential',
    );

    throw new UnauthorizedException('Logging ingest credential required');
  }

  /**
   * Emit a structured, greppable error line for every rejected ingest attempt.
   * stdout is the only channel available here (writing into LogsService would
   * recurse through the very path being rejected).
   */
  private reportRejection(serviceName: string, reason: string): void {
    console.error(JSON.stringify({
      level: 'error',
      event: 'log_ingest_rejected',
      message: `Log ingest rejected for service "${serviceName || '<unnamed>'}" (${reason})`,
      service: serviceName || '<unnamed>',
      reason,
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      hint: 'Sender holds no valid ingest credential — it is silently losing logs.',
    }));
  }

  private hasAnyCredential(request: RequestWithHeaders): boolean {
    const authorization = this.firstHeader(request, 'authorization');
    const apiKey = this.firstHeader(request, 'x-logging-api-key')
      || this.firstHeader(request, 'x-api-key');
    return Boolean(authorization || apiKey);
  }

  private requireAuth(): boolean {
    return (process.env.LOG_INGEST_REQUIRE_AUTH || '').toLowerCase() === 'true';
  }

  /**
   * Validate the bearer through Auth and require the ingest role.
   *
   * `POST /auth/validate` is used rather than local verification because it is
   * an approved verifier under the standard, it is already how every other guard
   * in this service checks a token, and roles come back resolved from Auth's
   * database — so a revoked role stops working immediately instead of at `exp`.
   *
   * Fail closed on Auth outage: without a verified principal there is no safe
   * ingest path.
   */
  private async hasValidServicePrincipal(request: RequestWithHeaders): Promise<boolean> {
    const authorization = this.firstHeader(request, 'authorization');
    if (!authorization?.startsWith('Bearer ')) return false;

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) return false;

    const authServiceUrl = (process.env.AUTH_SERVICE_URL || 'http://auth-microservice:3370').replace(/\/$/, '');

    let response: Response;
    try {
      response = await fetch(`${authServiceUrl}/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        event: 'log_ingest_auth_validate_unreachable',
        message: 'Auth validate unreachable during log ingest',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      }));
      throw new UnauthorizedException('Logging ingest credential required');
    }

    if (!response.ok) return false;

    const data = (await response.json()) as {
      valid?: boolean;
      user?: { roles?: unknown };
    };
    if (!data.valid || !data.user) return false;

    const roles = Array.isArray(data.user.roles) ? data.user.roles : [];
    return roles.some(
      (role) => typeof role === 'string' && INGEST_ROLES.has(role),
    );
  }

  private normalizeServiceName(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private enforceServiceAllowlist(serviceName: string): void {
    const allowed = this.csvToSet(process.env.LOG_INGEST_SERVICE_ALLOWLIST);
    if (allowed.size === 0) return;

    if (!serviceName || !allowed.has(serviceName)) {
      this.reportRejection(serviceName, 'not_in_allowlist');
      throw new ForbiddenException('Logging service is not allowed to ingest logs');
    }
  }

  private firstHeader(request: RequestWithHeaders, name: string): string | undefined {
    const headers = request.headers || {};
    const value = headers[name] || headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
  }

  private csvToSet(value?: string): Set<string> {
    return new Set(
      (value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }
}
