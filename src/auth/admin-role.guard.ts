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

type AuthValidateResponse = {
  valid?: boolean;
  user?: {
    roles?: unknown;
  };
};

@Injectable()
export class AdminRoleGuard implements CanActivate {
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
    const hasAdminRole = roles.some(
      (role) => typeof role === 'string' && REQUIRED_ADMIN_ROLES.has(role),
    );

    if (!hasAdminRole) {
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
