import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleScope } from '../../../../generated/prisma/client';
import { MembershipStatus } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import {
  AssignableRoleResponse,
  UserRoleAssignmentResponse,
} from '../dto/user-response.dto';
import {
  assertNotLastActiveSchoolAdmin,
  SCHOOL_ADMIN_ROLE,
} from './last-school-admin.guard';

/**
 * Role administration within the active school context.
 *
 * Only SCHOOL-scoped roles are assignable or revocable. SYSTEM roles
 * (including SUPER_ADMIN) can never be granted or revoked through normal
 * school administration.
 */
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the assignable role catalog. SYSTEM roles such as SUPER_ADMIN are
   * never exposed as assignable school roles.
   */
  async listAssignableRoles(): Promise<AssignableRoleResponse[]> {
    return this.prisma.role.findMany({
      where: { scope: RoleScope.SCHOOL },
      select: {
        id: true,
        name: true,
        description: true,
        scope: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Assigns a SCHOOL-scoped role to a member of the active school.
   * UserRole.schoolId is always the active school; the client cannot choose it.
   */
  async assignRole(
    activeSchoolId: string,
    userId: string,
    roleId: string,
  ): Promise<UserRoleAssignmentResponse> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, scope: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    if (role.scope !== RoleScope.SCHOOL) {
      throw new ForbiddenException(
        'System roles cannot be assigned through school administration.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.schoolMembership.findUnique({
        where: {
          userId_schoolId: { userId, schoolId: activeSchoolId },
        },
        select: { status: true },
      });

      if (!membership) {
        throw new NotFoundException('User is not a member of this school.');
      }

      if (membership.status !== MembershipStatus.ACTIVE) {
        throw new ForbiddenException(
          'Cannot assign roles to an inactive membership.',
        );
      }

      try {
        const assignment = await tx.userRole.create({
          data: { userId, roleId, schoolId: activeSchoolId },
          select: { id: true, userId: true, roleId: true, schoolId: true },
        });

        return {
          id: assignment.id,
          userId: assignment.userId,
          roleId: assignment.roleId,
          schoolId: assignment.schoolId ?? activeSchoolId,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'This role is already assigned to the user in this school.',
          );
        }

        throw error;
      }
    });
  }

  /**
   * Revokes a SCHOOL-scoped role from a member of the active school.
   * The assignment is removed only when it belongs to (userId, activeSchoolId).
   */
  async revokeRole(
    activeSchoolId: string,
    userId: string,
    roleId: string,
  ): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, scope: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    if (role.scope !== RoleScope.SCHOOL) {
      throw new ForbiddenException(
        'System roles cannot be revoked through school administration.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const membership = await tx.schoolMembership.findUnique({
        where: {
          userId_schoolId: { userId, schoolId: activeSchoolId },
        },
        select: { status: true },
      });

      if (!membership) {
        throw new NotFoundException('User is not a member of this school.');
      }

      if (role.name === SCHOOL_ADMIN_ROLE) {
        await assertNotLastActiveSchoolAdmin(tx, activeSchoolId, userId);
      }

      try {
        await tx.userRole.delete({
          where: {
            userId_roleId_schoolId: {
              userId,
              roleId,
              schoolId: activeSchoolId,
            },
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          throw new NotFoundException(
            'Role assignment not found in this school.',
          );
        }

        throw error;
      }
    });
  }
}
