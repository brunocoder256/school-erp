import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionService } from '../services/permission.service';
import { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Enforces @Permissions() metadata against the authenticated user's active school.
 *
 * Expected usage (AuthGuard must run first):
 *   @UseGuards(AuthGuard, PermissionGuard)
 *   @Permissions('students.read')
 *
 * Resolution path (database-authoritative, not JWT):
 *   authenticated user → activeSchoolId → SchoolMembership → UserRole → Role → RolePermission → Permission
 *
 * Multiple keys on @Permissions() use AND semantics — the user must have every key.
 * Routes without @Permissions() are not blocked by this guard.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user?.id) {
      throw new UnauthorizedException('Authentication required.');
    }

    const allowed = await this.permissionService.canUserAccess(
      user.id,
      user.activeSchoolId,
      requiredPermissions,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }

    return true;
  }
}
