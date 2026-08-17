import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionService } from '../services/permission.service';
import { AuthenticatedUser } from '../types/authenticated-request';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let permissionService: { canUserAccess: jest.Mock };

  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'teacher@example.com',
    fullName: 'Jane Teacher',
    activeSchoolId: 'school-a',
    roleNames: [],
    permissionKeys: [],
  };

  function createContext(
    requestUser: AuthenticatedUser | undefined,
  ): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: requestUser }),
      }),
    } as ExecutionContext;
  }

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    permissionService = {
      canUserAccess: jest.fn(),
    };
    guard = new PermissionGuard(
      reflector as unknown as Reflector,
      permissionService as unknown as PermissionService,
    );
  });

  it('allows when no permissions are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(createContext(user))).resolves.toBe(true);
    expect(permissionService.canUserAccess).not.toHaveBeenCalled();
  });

  it('allows when required permissions are an empty array', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    await expect(guard.canActivate(createContext(user))).resolves.toBe(true);
    expect(permissionService.canUserAccess).not.toHaveBeenCalled();
  });

  it('rejects missing authentication with 401', async () => {
    reflector.getAllAndOverride.mockReturnValue(['students.read']);

    await expect(guard.canActivate(createContext(undefined))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(permissionService.canUserAccess).not.toHaveBeenCalled();
  });

  it('allows when PermissionService grants access', async () => {
    reflector.getAllAndOverride.mockReturnValue(['students.read']);
    permissionService.canUserAccess.mockResolvedValue(true);

    await expect(guard.canActivate(createContext(user))).resolves.toBe(true);
    expect(permissionService.canUserAccess).toHaveBeenCalledWith(
      user.id,
      user.activeSchoolId,
      ['students.read'],
    );
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it('rejects insufficient permissions with 403', async () => {
    reflector.getAllAndOverride.mockReturnValue(['grades.approve']);
    permissionService.canUserAccess.mockResolvedValue(false);

    await expect(guard.canActivate(createContext(user))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('passes multiple required permissions through for AND checks', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      'grades.enter',
      'grades.update',
    ]);
    permissionService.canUserAccess.mockResolvedValue(true);

    await expect(guard.canActivate(createContext(user))).resolves.toBe(true);
    expect(permissionService.canUserAccess).toHaveBeenCalledWith(
      user.id,
      user.activeSchoolId,
      ['grades.enter', 'grades.update'],
    );
  });
});
