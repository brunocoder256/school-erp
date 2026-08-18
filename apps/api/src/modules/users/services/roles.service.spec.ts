import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, RoleScope } from '../../../../generated/prisma/client';
import { MembershipStatus } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;

  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    schoolMembership: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userRole: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
    role: { findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(prisma),
    ),
  };

  const schoolA = 'school-a';
  const schoolRole = {
    id: 'role-1',
    name: 'TEACHER',
    description: null,
    scope: RoleScope.SCHOOL,
  };
  const systemRole = {
    id: 'role-sys',
    name: 'SUPER_ADMIN',
    scope: RoleScope.SYSTEM,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(RolesService);
  });

  describe('listAssignableRoles', () => {
    it('returns only SCHOOL-scoped roles, never SYSTEM roles', async () => {
      prisma.role.findMany.mockResolvedValue([schoolRole]);

      const result = await service.listAssignableRoles();

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scope: RoleScope.SCHOOL },
        }),
      );
      expect(result).toEqual([schoolRole]);
    });
  });

  describe('assignRole', () => {
    it('rejects an unknown role', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(
        service.assignRole(schoolA, 'user-1', 'role-x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to assign a SYSTEM role through school administration', async () => {
      prisma.role.findUnique.mockResolvedValue(systemRole);

      await expect(
        service.assignRole(schoolA, 'user-1', systemRole.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a user who is not a member of the active school', async () => {
      prisma.role.findUnique.mockResolvedValue(schoolRole);
      prisma.schoolMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.assignRole(schoolA, 'user-1', schoolRole.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects assignment to an inactive membership', async () => {
      prisma.role.findUnique.mockResolvedValue(schoolRole);
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.INACTIVE,
      });

      await expect(
        service.assignRole(schoolA, 'user-1', schoolRole.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('maps a duplicate assignment to a conflict', async () => {
      prisma.role.findUnique.mockResolvedValue(schoolRole);
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.ACTIVE,
      });
      prisma.userRole.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.assignRole(schoolA, 'user-1', schoolRole.id),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('assigns the role within the active school scope', async () => {
      prisma.role.findUnique.mockResolvedValue(schoolRole);
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.ACTIVE,
      });
      prisma.userRole.create.mockResolvedValue({
        id: 'ur-1',
        userId: 'user-1',
        roleId: schoolRole.id,
        schoolId: schoolA,
      });

      const result = await service.assignRole(schoolA, 'user-1', schoolRole.id);

      expect(prisma.userRole.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: 'user-1', roleId: schoolRole.id, schoolId: schoolA },
        }),
      );
      expect(result).toEqual({
        id: 'ur-1',
        userId: 'user-1',
        roleId: schoolRole.id,
        schoolId: schoolA,
      });
    });
  });

  describe('revokeRole', () => {
    it('rejects an unknown role', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeRole(schoolA, 'user-1', 'role-x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to revoke a SYSTEM role through school administration', async () => {
      prisma.role.findUnique.mockResolvedValue(systemRole);

      await expect(
        service.revokeRole(schoolA, 'user-1', systemRole.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a user who is not a member of the active school', async () => {
      prisma.role.findUnique.mockResolvedValue(schoolRole);
      prisma.schoolMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeRole(schoolA, 'user-1', schoolRole.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to revoke SCHOOL_ADMIN when the user is the last active administrator', async () => {
      prisma.role.findUnique.mockResolvedValue({
        ...schoolRole,
        name: 'SCHOOL_ADMIN',
      });
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.ACTIVE,
      });
      prisma.userRole.findMany.mockResolvedValue([{ userId: 'user-1' }]);

      await expect(
        service.revokeRole(schoolA, 'user-1', schoolRole.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('maps a missing assignment to not found', async () => {
      prisma.role.findUnique.mockResolvedValue(schoolRole);
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.ACTIVE,
      });
      prisma.userRole.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.revokeRole(schoolA, 'user-1', schoolRole.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('revokes the assignment scoped to the active school', async () => {
      prisma.role.findUnique.mockResolvedValue(schoolRole);
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.ACTIVE,
      });
      prisma.userRole.delete.mockResolvedValue({ id: 'ur-1' });

      await service.revokeRole(schoolA, 'user-1', schoolRole.id);

      expect(prisma.userRole.delete).toHaveBeenCalledWith({
        where: {
          userId_roleId_schoolId: {
            userId: 'user-1',
            roleId: schoolRole.id,
            schoolId: schoolA,
          },
        },
      });
    });
  });
});
