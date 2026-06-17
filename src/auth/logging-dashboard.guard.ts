import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

const DASHBOARD_READ_PERMISSION = 'logging.dashboard.read';
const ADMIN_OVERRIDE_ROLES = new Set([
  'global:superadmin',
  'app:logging-microservice:admin',
  'internal:logging-microservice:admin',
]);

type AuthUser = {
  id?: string;
  sub?: string;
  email?: string;
  roles?: unknown;
  tenant_id?: string;
  tenantId?: string;
};

type AuthValidateResponse = {
  valid?: boolean;
  user?: AuthUser;
};

export type LoggingDashboardUser = AuthUser & {
  tenantId: string;
};

@Injectable()
export class LoggingDashboardGuard implements CanActivate {
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
    const hasDashboardRead = roles.some((role) => role === DASHBOARD_READ_PERMISSION);
    const hasAdminOverride = roles.some(
      (role) => typeof role === 'string' && ADMIN_OVERRIDE_ROLES.has(role),
    );

    if (!hasDashboardRead && !hasAdminOverride) {
      throw new ForbiddenException('Logging dashboard read permission required');
    }

    const tenantId = this.deriveTenantId(user);
    request.user = { ...user, tenantId } satisfies LoggingDashboardUser;
    return true;
  }

  private async validateToken(token: string): Promise<AuthUser> {
    const configuredUrl = process.env.AUTH_SERVICE_URL || 'http://auth-microservice:3370';
    const authServiceUrl = configuredUrl.endsWith('/') ? configuredUrl.slice(0, -1) : configuredUrl;

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

  private deriveTenantId(user: AuthUser): string {
    if (typeof user.tenant_id === 'string' && user.tenant_id.trim()) {
      return user.tenant_id.trim();
    }

    if (typeof user.tenantId === 'string' && user.tenantId.trim()) {
      return user.tenantId.trim();
    }

    const userId = typeof user.id === 'string' && user.id.trim()
      ? user.id.trim()
      : typeof user.sub === 'string' && user.sub.trim()
        ? user.sub.trim()
        : '';

    if (!userId) {
      throw new UnauthorizedException('Tenant scope unavailable');
    }

    return 'auth_user:' + userId;
  }
}
