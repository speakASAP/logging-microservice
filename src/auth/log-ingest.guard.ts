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

@Injectable()
export class LogIngestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const serviceName = this.normalizeServiceName(request.body?.service);

    this.enforceServiceAllowlist(serviceName);

    if (!this.requireAuth()) {
      return true;
    }

    if (this.hasValidApiKey(request) || this.hasValidBearer(request)) {
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

  private hasValidApiKey(request: RequestWithHeaders): boolean {
    const configured = this.csvToSet(process.env.LOG_INGEST_API_KEYS);
    if (configured.size === 0) return false;

    const provided = this.firstHeader(request, 'x-logging-api-key') || this.firstHeader(request, 'x-api-key');
    return Boolean(provided && configured.has(provided));
  }

  private hasValidBearer(request: RequestWithHeaders): boolean {
    // LOG_INGEST_BEARER_TOKENS is the only accepted set. JWT_TOKEN used to be
    // added here as well, which silently made the shared a2880693 value — the
    // credential for five unrelated services — a valid ingest key. It was
    // measured on 2026-08-27 to have no senders: every ingesting pod resolves
    // LOGGING_SERVICE_TOKEN, and the three that fall back to JWT_TOKEN
    // (aukro, bazos, heureka) send their logs unauthenticated.
    const configured = this.csvToSet(process.env.LOG_INGEST_BEARER_TOKENS);
    if (configured.size === 0) return false;

    const authorization = this.firstHeader(request, 'authorization');
    if (!authorization?.startsWith('Bearer ')) return false;

    const token = authorization.slice('Bearer '.length).trim();
    return configured.has(token);
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
