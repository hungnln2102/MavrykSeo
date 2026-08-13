import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

function createContext(userRole?: string) {
  return {
    getHandler: () => ({}) as never,
    getClass: () => ({}) as never,
    switchToHttp: () => ({
      getRequest: () => ({ userRole }),
    }),
  } as never;
}

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows a route without role metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });

  it('allows a member whose role is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    expect(guard.canActivate(createContext('admin'))).toBe(true);
  });

  it('rejects a request before a workspace role is resolved', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    expect(() => guard.canActivate(createContext())).toThrow(
      new ForbiddenException('User role is not resolved for this workspace'),
    );
  });

  it('rejects a member without one of the required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['owner', 'admin']);

    expect(() => guard.canActivate(createContext('viewer'))).toThrow(ForbiddenException);
  });
});