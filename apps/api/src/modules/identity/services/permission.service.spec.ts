import { Test, TestingModule } from '@nestjs/testing';
import {
  MembershipStatus,
  RoleScope,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { PermissionService } from './permission.service';

type UserRoleRow = {
  role: {
    rolePermissions: Array<{ permission: { key: string } }>;
  };
};

function roleWithPermissions(...keys: string[]): UserRoleRow {
  return {
    role: {
      rolePermissions: keys.map((key) => ({ permission: { key } })),
    },
  };
}

describe('PermissionService', () => {
  let service: PermissionService;
  let prisma: {
    schoolMembership: { findUnique: jest.Mock };
    userRole: { findMany: jest.Mock };
  };

  const userId = 'user-1';
  const schoolA = 'school-a';
  const schoolB = 'school-b';

  beforeEach(async () => {
    prisma = {
      schoolMembership: { findUnique: jest.fn() },
      userRole: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PermissionService);
  });

  it('allows when no permissions are required', async () => {
    const allowed = await service.canUserAccess(userId, schoolA, []);

    expect(allowed).toBe(true);
    expect(prisma.schoolMembership.findUnique).not.toHaveBeenCalled();
    expect(prisma.userRole.findMany).not.toHaveBeenCalled();
  });

  it('denies when activeSchoolId is set but membership is missing', async () => {
    prisma.schoolMembership.findUnique.mockResolvedValue(null);

    const allowed = await service.canUserAccess(userId, schoolA, [
      'students.read',
    ]);

    expect(allowed).toBe(false);
    expect(prisma.userRole.findMany).not.toHaveBeenCalled();
  });

  it('denies when activeSchoolId is set but membership is inactive', async () => {
    prisma.schoolMembership.findUnique.mockResolvedValue({
      status: MembershipStatus.INACTIVE,
    });

    const allowed = await service.canUserAccess(userId, schoolA, [
      'students.read',
    ]);

    expect(allowed).toBe(false);
    expect(prisma.userRole.findMany).not.toHaveBeenCalled();
  });

  it('denies a school-role user with null activeSchoolId (no school context)', async () => {
    prisma.userRole.findMany.mockResolvedValue([]);

    const allowed = await service.canUserAccess(userId, null, [
      'students.read',
    ]);

    expect(allowed).toBe(false);
    expect(prisma.schoolMembership.findUnique).not.toHaveBeenCalled();
    expect(prisma.userRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId,
          OR: [
            {
              schoolId: null,
              role: { scope: RoleScope.SYSTEM },
            },
          ],
        },
      }),
    );
  });

  it('denies when the user has membership but no roles', async () => {
    prisma.schoolMembership.findUnique.mockResolvedValue({
      status: MembershipStatus.ACTIVE,
    });
    prisma.userRole.findMany.mockResolvedValue([]);

    const allowed = await service.canUserAccess(userId, schoolA, [
      'students.read',
    ]);

    expect(allowed).toBe(false);
  });

  it('grants access from a single school role', async () => {
    prisma.schoolMembership.findUnique.mockResolvedValue({
      status: MembershipStatus.ACTIVE,
    });
    prisma.userRole.findMany.mockResolvedValue([
      roleWithPermissions('students.read', 'attendance.read'),
    ]);

    const allowed = await service.canUserAccess(userId, schoolA, [
      'students.read',
    ]);

    expect(allowed).toBe(true);
  });

  it('denies when the required permission is absent from the role', async () => {
    prisma.schoolMembership.findUnique.mockResolvedValue({
      status: MembershipStatus.ACTIVE,
    });
    prisma.userRole.findMany.mockResolvedValue([
      roleWithPermissions('students.read'),
    ]);

    const allowed = await service.canUserAccess(userId, schoolA, [
      'grades.approve',
    ]);

    expect(allowed).toBe(false);
  });

  it('unions permissions across multiple school roles', async () => {
    prisma.schoolMembership.findUnique.mockResolvedValue({
      status: MembershipStatus.ACTIVE,
    });
    prisma.userRole.findMany.mockResolvedValue([
      roleWithPermissions('students.read'),
      roleWithPermissions('grades.enter', 'grades.update'),
    ]);

    const allowed = await service.canUserAccess(userId, schoolA, [
      'students.read',
      'grades.enter',
    ]);

    expect(allowed).toBe(true);
  });

  it('requires every listed permission (AND semantics)', async () => {
    prisma.schoolMembership.findUnique.mockResolvedValue({
      status: MembershipStatus.ACTIVE,
    });
    prisma.userRole.findMany.mockResolvedValue([
      roleWithPermissions('students.read'),
    ]);

    const allowed = await service.canUserAccess(userId, schoolA, [
      'students.read',
      'grades.enter',
    ]);

    expect(allowed).toBe(false);
  });

  it('does not use roles from another school (cross-school isolation)', async () => {
    prisma.schoolMembership.findUnique.mockResolvedValue({
      status: MembershipStatus.ACTIVE,
    });
    // Query result already scoped by Prisma where clause — empty for school A
    prisma.userRole.findMany.mockResolvedValue([]);

    const allowed = await service.canUserAccess(userId, schoolA, [
      'grades.approve',
    ]);

    expect(allowed).toBe(false);
    expect(prisma.userRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId,
          OR: [
            {
              schoolId: null,
              role: { scope: RoleScope.SYSTEM },
            },
            {
              schoolId: schoolA,
              role: { scope: RoleScope.SCHOOL },
            },
          ],
        },
      }),
    );
    expect(prisma.userRole.findMany.mock.calls[0][0].where.OR).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ schoolId: schoolB }),
      ]),
    );
  });

  it('grants SYSTEM role permissions without school membership when activeSchoolId is null', async () => {
    prisma.userRole.findMany.mockResolvedValue([
      roleWithPermissions('schools.create', 'schools.delete'),
    ]);

    const allowed = await service.canUserAccess(userId, null, [
      'schools.create',
    ]);

    expect(allowed).toBe(true);
    expect(prisma.schoolMembership.findUnique).not.toHaveBeenCalled();
  });

  it('includes SYSTEM role permissions together with school roles when activeSchoolId is set', async () => {
    prisma.schoolMembership.findUnique.mockResolvedValue({
      status: MembershipStatus.ACTIVE,
    });
    prisma.userRole.findMany.mockResolvedValue([
      roleWithPermissions('schools.create'),
      roleWithPermissions('students.read'),
    ]);

    const allowed = await service.canUserAccess(userId, schoolA, [
      'schools.create',
      'students.read',
    ]);

    expect(allowed).toBe(true);
    expect(prisma.userRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId,
          OR: [
            {
              schoolId: null,
              role: { scope: RoleScope.SYSTEM },
            },
            {
              schoolId: schoolA,
              role: { scope: RoleScope.SCHOOL },
            },
          ],
        },
      }),
    );
  });
});
