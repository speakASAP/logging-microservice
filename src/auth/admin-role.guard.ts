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
  constructor(private readonly allowedRoles: ReadonlySet<string> = REQUIRED_ADMIN_ROLES) {}

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
  constructor() {
    super(READ_ONLY_ROLES);
  }
}
