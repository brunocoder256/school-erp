import { Injectable } from '@nestjs/common';
import {
  MembershipStatus,
  RoleScope,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Database-resolved role and permission context for the active school.
 */
export interface ActiveUserContext {
  roleNames: string[];
  permissionKeys: string[];
}

/**
 * Resolves effective permissions from the database for the active school context.
 *
 * Applicable roles:
 * - SYSTEM roles: UserRole.schoolId IS NULL (not tenant-bound)
 * - SCHOOL roles: UserRole.schoolId = activeSchoolId only
 *
 * Effective permissions are the union of RolePermission rows for those roles.
 * Multiple required permissions use AND semantics (caller must have every key).
 */
@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns whether the user holds every required permission in the given school context.
   *
   * When `activeSchoolId` is set, an ACTIVE SchoolMembership for that school is required.
   * Roles from any other school are never considered.
   */
  async canUserAccess(
    userId: string,
    activeSchoolId: string | null,
    requiredPermissions: string[],
  ): Promise<boolean> {
    if (requiredPermissions.length === 0) {
      return true;
    }

    const effectiveKeys = await this.getEffectivePermissionKeys(
      userId,
      activeSchoolId,
    );

    if (effectiveKeys === null) {
      return false;
    }

    return requiredPermissions.every((key) => effectiveKeys.has(key));
  }

  /**
   * Loads the effective permission key set for the user in the active school context.
   *
   * Returns `null` when `activeSchoolId` is set but the user has no ACTIVE membership
   * (authorization failure — do not proceed with role resolution for that school).
   */
  async getEffectivePermissionKeys(
    userId: string,
    activeSchoolId: string | null,
  ): Promise<Set<string> | null> {
    const context = await this.resolveActiveContext(userId, activeSchoolId);

    return context === null ? null : new Set(context.permissionKeys);
  }

  /**
   * Resolves the effective role names and permission keys for the authenticated
   * user in the active school context. Database-authoritative — never trusts JWT.
   *
   * When `activeSchoolId` is set, the user must have an ACTIVE SchoolMembership
   * for that school; only SYSTEM roles and SCHOOL roles scoped to that school
   * contribute. Roles from any other school never appear.
   *
   * Returns `null` when `activeSchoolId` is set but the membership is missing or
   * inactive (the caller decides how to handle an invalidated tenant context).
   */
  async resolveActiveContext(
    userId: string,
    activeSchoolId: string | null,
  ): Promise<ActiveUserContext | null> {
    if (activeSchoolId) {
      const membership = await this.prisma.schoolMembership.findUnique({
        where: {
          userId_schoolId: {
            userId,
            schoolId: activeSchoolId,
          },
        },
        select: { status: true },
      });

      if (!membership || membership.status !== MembershipStatus.ACTIVE) {
        return null;
      }
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        OR: [
          {
            schoolId: null,
            role: { scope: RoleScope.SYSTEM },
          },
          ...(activeSchoolId
            ? [
                {
                  schoolId: activeSchoolId,
                  role: { scope: RoleScope.SCHOOL },
                },
              ]
            : []),
        ],
      },
      select: {
        role: {
          select: {
            name: true,
            rolePermissions: {
              select: {
                permission: {
                  select: { key: true },
                },
              },
            },
          },
        },
      },
    });

    const roleNames = new Set<string>();
    const permissionKeys = new Set<string>();

    for (const userRole of userRoles) {
      if (userRole.role.name) {
        roleNames.add(userRole.role.name);
      }

      for (const rolePermission of userRole.role.rolePermissions) {
        permissionKeys.add(rolePermission.permission.key);
      }
    }

    return {
      roleNames: [...roleNames],
      permissionKeys: [...permissionKeys],
    };
  }
}
