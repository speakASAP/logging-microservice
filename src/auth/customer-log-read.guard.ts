import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

const DEFAULT_CUSTOMER_ROLES = new Set(['app:logging-microservice:customer']);

type AuthValidateResponse = {
  valid?: boolean;
  user?: AuthenticatedLoggingUser;
};

export type AuthenticatedLoggingUser = {
  id?: string;
  sub?: string;
  email?: string;
  roles?: unknown;
  tenant_id?: unknown;
  tenantId?: unknown;
  tenant_ids?: unknown;
  tenantIds?: unknown;
  tenants?: unknown;
};

export type CustomerLogAccess = {
  user: AuthenticatedLoggingUser;
  tenantIds: string[];
};

@Injectable()
export class CustomerLogReadGuard implements CanActivate {
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
    const allowedRoles = this.getAllowedRoles();
    const hasCustomerRole = roles.some(
      (role) => typeof role === 'string' && allowedRoles.has(role),
    );

    if (!hasCustomerRole) {
      throw new ForbiddenException('Logging customer role required');
    }

    const tenantIds = this.resolveTenantIds(user);
    if (tenantIds.length === 0) {
      throw new ForbiddenException('Logging customer tenant mapping required');
    }

    request.user = user;
    request.customerLogAccess = { user, tenantIds } satisfies CustomerLogAccess;
    return true;
  }

  private getAllowedRoles(): Set<string> {
    const roles = new Set(DEFAULT_CUSTOMER_ROLES);
    for (const role of (process.env.LOGGING_CUSTOMER_READ_ROLES || '').split(',')) {
      const normalized = role.trim();
      if (normalized) roles.add(normalized);
    }
    return roles;
  }

  private resolveTenantIds(user: AuthenticatedLoggingUser): string[] {
    const tenantIds = new Set<string>();
    const addTenant = (value: unknown) => {
      if (typeof value === 'string' && value.trim()) tenantIds.add(value.trim());
    };

    addTenant(user.tenant_id);
    addTenant(user.tenantId);
    this.addArrayTenants(user.tenant_ids, tenantIds);
    this.addArrayTenants(user.tenantIds, tenantIds);
    this.addArrayTenants(user.tenants, tenantIds);

    const memberships = this.getConfiguredMemberships();
    const candidateKeys = [user.id, user.sub, user.email, user.email?.toLowerCase()].filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );

    for (const key of candidateKeys) {
      const mapped = memberships.get(key) || memberships.get(key.toLowerCase());
      if (!mapped) continue;
      for (const tenantId of mapped) addTenant(tenantId);
    }

    return Array.from(tenantIds).sort();
  }

  private addArrayTenants(value: unknown, tenantIds: Set<string>) {
    if (!Array.isArray(value)) return;

    for (const item of value) {
      if (typeof item === 'string' && item.trim()) {
        tenantIds.add(item.trim());
      } else if (item && typeof item === 'object') {
        const maybeId = (item as { id?: unknown; tenant_id?: unknown; tenantId?: unknown }).id
          || (item as { tenant_id?: unknown }).tenant_id
          || (item as { tenantId?: unknown }).tenantId;
        if (typeof maybeId === 'string' && maybeId.trim()) tenantIds.add(maybeId.trim());
      }
    }
  }

  private getConfiguredMemberships(): Map<string, string[]> {
    const memberships = new Map<string, string[]>();
    const raw = process.env.LOGGING_CUSTOMER_TENANT_MEMBERSHIPS;
    if (!raw) return memberships;

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const [principal, tenants] of Object.entries(parsed || {})) {
        const tenantList = Array.isArray(tenants) ? tenants : [tenants];
        memberships.set(
          principal,
          tenantList.filter((tenant): tenant is string => typeof tenant === 'string' && tenant.trim().length > 0),
        );
      }
      return memberships;
    } catch {
      for (const entry of raw.split(';')) {
        const [principal, tenantCsv] = entry.split('=');
        if (!principal?.trim() || !tenantCsv?.trim()) continue;
        memberships.set(
          principal.trim(),
          tenantCsv.split(',').map((tenant) => tenant.trim()).filter(Boolean),
        );
      }
      return memberships;
    }
  }

  private async validateToken(token: string): Promise<AuthenticatedLoggingUser> {
    const authServiceUrl = (process.env.AUTH_SERVICE_URL || 'http://auth-microservice:3370').replace(/\/$/, '');

    try {
      const response = await fetch(authServiceUrl + '/auth/validate', {
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
