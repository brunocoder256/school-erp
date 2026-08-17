import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  MembershipStatus,
  UserStatus,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-request';
import { IdentityService } from './identity.service';
import { PasswordService } from './password.service';
import { PermissionService } from './permission.service';

describe('IdentityService', () => {
  let identityService: IdentityService;
  let prisma: {
    user: { findUnique: jest.Mock };
  };
  let passwordService: { verify: jest.Mock };
  let jwtService: { signAsync: jest.Mock };
  let permissionService: { resolveActiveContext: jest.Mock };

  const schoolA = { id: 'school-a', name: 'School A', code: 'A' };
  const schoolB = { id: 'school-b', name: 'School B', code: 'B' };

  const baseUser = {
    id: 'user-1',
    email: 'teacher@example.com',
    fullName: 'Jane Teacher',
    passwordHash: 'hashed',
    status: UserStatus.ACTIVE,
    memberships: [] as Array<{
      schoolId: string;
      status: MembershipStatus;
      school: typeof schoolA;
    }>,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    passwordService = {
      verify: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    };
    permissionService = {
      resolveActiveContext: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityService,
        { provide: PrismaService, useValue: prisma },
        { provide: PasswordService, useValue: passwordService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
            get: jest.fn().mockReturnValue('1d'),
          },
        },
        { provide: PermissionService, useValue: permissionService },
      ],
    }).compile();

    identityService = module.get(IdentityService);
  });

  describe('login', () => {
    it('succeeds with valid credentials and no memberships', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, memberships: [] });
      passwordService.verify.mockResolvedValue(true);

      const result = await identityService.login(
        'teacher@example.com',
        'SecurePass123!',
      );

      expect(result.accessToken).toBe('access-token');
      expect(result.requiresSchoolSelection).toBe(false);
      expect(result.user.activeSchoolId).toBeNull();
      expect(result.schools).toEqual([]);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'user-1', activeSchoolId: null },
        expect.any(Object),
      );
    });

    it('sets activeSchoolId when the user has exactly one membership', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        memberships: [
          {
            schoolId: schoolA.id,
            status: MembershipStatus.ACTIVE,
            school: schoolA,
          },
        ],
      });
      passwordService.verify.mockResolvedValue(true);

      const result = await identityService.login(
        'teacher@example.com',
        'SecurePass123!',
      );

      expect(result.requiresSchoolSelection).toBe(false);
      expect(result.user.activeSchoolId).toBe(schoolA.id);
      expect(result.schools).toEqual([schoolA]);
    });

    it('does not silently choose a school when memberships are multiple', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        memberships: [
          {
            schoolId: schoolA.id,
            status: MembershipStatus.ACTIVE,
            school: schoolA,
          },
          {
            schoolId: schoolB.id,
            status: MembershipStatus.ACTIVE,
            school: schoolB,
          },
        ],
      });
      passwordService.verify.mockResolvedValue(true);

      const result = await identityService.login(
        'teacher@example.com',
        'SecurePass123!',
      );

      expect(result.requiresSchoolSelection).toBe(true);
      expect(result.user.activeSchoolId).toBeNull();
      expect(result.schools).toEqual([schoolA, schoolB]);
    });

    it('fails safely for an incorrect password', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, memberships: [] });
      passwordService.verify.mockResolvedValue(false);

      await expect(
        identityService.login('teacher@example.com', 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('fails safely for an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        identityService.login('missing@example.com', 'SecurePass123!'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('fails for inactive users without revealing account details', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        status: UserStatus.INACTIVE,
        memberships: [],
      });
      passwordService.verify.mockResolvedValue(true);

      await expect(
        identityService.login('teacher@example.com', 'SecurePass123!'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('selectSchool', () => {
    it('issues a token for an active membership school', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        memberships: [
          {
            schoolId: schoolA.id,
            status: MembershipStatus.ACTIVE,
            school: schoolA,
          },
          {
            schoolId: schoolB.id,
            status: MembershipStatus.ACTIVE,
            school: schoolB,
          },
        ],
      });

      const result = await identityService.selectSchool('user-1', schoolB.id);

      expect(result.requiresSchoolSelection).toBe(false);
      expect(result.user.activeSchoolId).toBe(schoolB.id);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'user-1', activeSchoolId: schoolB.id },
        expect.any(Object),
      );
    });

    it('rejects a school without an active membership', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        memberships: [
          {
            schoolId: schoolA.id,
            status: MembershipStatus.ACTIVE,
            school: schoolA,
          },
        ],
      });

      await expect(
        identityService.selectSchool('user-1', schoolB.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('me', () => {
    const authenticatedUser: AuthenticatedUser = {
      id: 'user-1',
      email: 'teacher@example.com',
      fullName: 'Jane Teacher',
      activeSchoolId: schoolA.id,
      roleNames: [],
      permissionKeys: [],
    };

    it('returns user info with roles and permissions resolved from the database', async () => {
      permissionService.resolveActiveContext.mockResolvedValue({
        roleNames: ['TEACHER'],
        permissionKeys: ['students.read', 'grades.enter'],
      });

      const result = await identityService.me(authenticatedUser);

      expect(result).toEqual({
        id: 'user-1',
        email: 'teacher@example.com',
        fullName: 'Jane Teacher',
        activeSchoolId: schoolA.id,
        roleNames: ['TEACHER'],
        permissionKeys: ['students.read', 'grades.enter'],
      });
      expect(permissionService.resolveActiveContext).toHaveBeenCalledWith(
        'user-1',
        schoolA.id,
      );
    });

    it('returns empty roles and permissions when no context can be resolved', async () => {
      permissionService.resolveActiveContext.mockResolvedValue(null);

      const result = await identityService.me(authenticatedUser);

      expect(result.roleNames).toEqual([]);
      expect(result.permissionKeys).toEqual([]);
    });

    it('never returns roles or permissions from another school context', async () => {
      permissionService.resolveActiveContext.mockResolvedValue({
        roleNames: ['TEACHER'],
        permissionKeys: ['students.read'],
      });

      const result = await identityService.me({
        ...authenticatedUser,
        activeSchoolId: schoolB.id,
      });

      expect(result.activeSchoolId).toBe(schoolB.id);
      expect(result.permissionKeys).not.toContain('grades.approve');
      expect(result.permissionKeys).toEqual(['students.read']);
    });
  });
});
