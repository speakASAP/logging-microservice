import 'reflect-metadata';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminRoleGuard, LogReadRoleGuard } from '../src/auth/admin-role.guard';

function createContext(request: any = { headers: {} }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
}

function mockValidate(roles: string[] | null) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () =>
      roles === null ? { valid: false } : { valid: true, user: { roles } },
  }) as any;
}

describe('logging role guards', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects a request with no bearer token', async () => {
    const guard = new AdminRoleGuard();
    await expect(guard.canActivate(createContext())).rejects.toThrow(UnauthorizedException);
  });

  it('accepts an admin role on the admin guard', async () => {
    mockValidate(['internal:logging-microservice:admin']);
    const guard = new AdminRoleGuard();
    const request = { headers: { authorization: 'Bearer t' } };
    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('refuses the readonly role on the admin guard', async () => {
    mockValidate(['internal:logging-microservice:readonly']);
    const guard = new AdminRoleGuard();
    const request = { headers: { authorization: 'Bearer t' } };
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(ForbiddenException);
  });

  it('accepts the readonly role on the read guard', async () => {
    mockValidate(['internal:logging-microservice:readonly']);
    const guard = new LogReadRoleGuard();
    const request = { headers: { authorization: 'Bearer t' } };
    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('still accepts admin roles on the read guard', async () => {
    mockValidate(['global:superadmin']);
    const guard = new LogReadRoleGuard();
    const request = { headers: { authorization: 'Bearer t' } };
    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('refuses an unrelated role on the read guard', async () => {
    mockValidate(['internal:catalog-microservice:admin']);
    const guard = new LogReadRoleGuard();
    const request = { headers: { authorization: 'Bearer t' } };
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(ForbiddenException);
  });

  // Regression: AdminRoleGuard once took its role set as a constructor argument.
  // Directly-constructed unit tests passed while Nest failed to resolve the
  // parameter at boot, crash-looping the whole service. Resolve through the DI
  // container so a non-injectable constructor fails here instead of in production.
  it('both guards resolve through the Nest DI container', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AdminRoleGuard, LogReadRoleGuard],
    }).compile();

    expect(moduleRef.get(AdminRoleGuard)).toBeInstanceOf(AdminRoleGuard);
    expect(moduleRef.get(LogReadRoleGuard)).toBeInstanceOf(LogReadRoleGuard);
  });

  it('the read guard resolved by DI still accepts readonly', async () => {
    mockValidate(['internal:logging-microservice:readonly']);
    const moduleRef = await Test.createTestingModule({
      providers: [LogReadRoleGuard],
    }).compile();
    const guard = moduleRef.get(LogReadRoleGuard);
    const request = { headers: { authorization: 'Bearer t' } };
    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

});
