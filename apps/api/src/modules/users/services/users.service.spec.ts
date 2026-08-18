import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import {
  MembershipStatus,
  UserStatus,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { PasswordService } from '../../identity/services/password.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    schoolMembership: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userRole: { findMany: jest.fn() },
    role: { findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(prisma),
    ),
  };

  const passwordService = {
    hash: jest.fn().mockResolvedValue('hashed-password'),
    verify: jest.fn(),
  };

  const schoolA = 'school-a';
  const userRecord = {
    id: 'user-1',
    email: 'teacher@example.com',
    fullName: 'Jane Teacher',
    status: UserStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: PasswordService, useValue: passwordService },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('createUser', () => {
    it('creates an account with a normalized email and a hashed password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(userRecord);

      const result = await service.createUser({
        email: '  TEACHER@Example.com ',
        password: 'SecurePass123!',
        fullName: '  Jane Teacher  ',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'teacher@example.com' },
        select: { id: true },
      });
      expect(passwordService.hash).toHaveBeenCalledWith('SecurePass123!');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: 'teacher@example.com',
            passwordHash: 'hashed-password',
            fullName: 'Jane Teacher',
            status: UserStatus.ACTIVE,
          },
        }),
      );
      expect(result.email).toBe('teacher@example.com');
    });

    it('rejects an email that is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      await expect(
        service.createUser({
          email: 'teacher@example.com',
          password: 'SecurePass123!',
          fullName: 'Jane Teacher',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a duplicate-key race to a conflict', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.createUser({
          email: 'teacher@example.com',
          password: 'SecurePass123!',
          fullName: 'Jane Teacher',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('listMembers', () => {
    it('queries memberships of the active school only', async () => {
      prisma.schoolMembership.findMany.mockResolvedValue([
        {
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date('2024-01-01'),
          user: {
            id: 'user-1',
            email: 'teacher@example.com',
            fullName: 'Jane Teacher',
            status: UserStatus.ACTIVE,
          },
          userRoles: [
            { role: { name: 'TEACHER' } },
            { role: { name: 'STAFF' } },
          ],
        },
      ]);

      const result = await service.listMembers(schoolA);

      expect(prisma.schoolMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: schoolA },
        }),
      );
      expect(result).toEqual([
        {
          userId: 'user-1',
          email: 'teacher@example.com',
          fullName: 'Jane Teacher',
          userStatus: UserStatus.ACTIVE,
          membershipStatus: MembershipStatus.ACTIVE,
          joinedAt: expect.any(Date),
          roleNames: ['TEACHER', 'STAFF'],
        },
      ]);
    });
  });

  describe('getMember', () => {
    it('returns the member when a membership exists for the active school', async () => {
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date('2024-01-01'),
        user: {
          id: 'user-1',
          email: 'teacher@example.com',
          fullName: 'Jane Teacher',
          status: UserStatus.ACTIVE,
        },
        userRoles: [],
      });

      const result = await service.getMember(schoolA, 'user-1');

      expect(result.userId).toBe('user-1');
      expect(prisma.schoolMembership.findUnique).toHaveBeenCalledWith({
        where: { userId_schoolId: { userId: 'user-1', schoolId: schoolA } },
        select: expect.any(Object),
      });
    });

    it('reports foreign or unknown users as not found', async () => {
      prisma.schoolMembership.findUnique.mockResolvedValue(null);

      await expect(service.getMember(schoolA, 'user-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createMembership', () => {
    it('rejects an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createMembership(schoolA, 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.INACTIVE,
      });

      await expect(
        service.createMembership(schoolA, 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a duplicate membership', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.ACTIVE,
      });
      prisma.schoolMembership.findUnique.mockResolvedValue({ id: 'm-1' });

      await expect(
        service.createMembership(schoolA, 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates an ACTIVE membership scoped to the active school', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.ACTIVE,
      });
      prisma.schoolMembership.findUnique.mockResolvedValue(null);
      prisma.schoolMembership.create.mockResolvedValue({
        userId: 'user-1',
        schoolId: schoolA,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date('2024-01-01'),
      });

      const result = await service.createMembership(schoolA, 'user-1');

      expect(prisma.schoolMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: 'user-1',
            schoolId: schoolA,
            status: MembershipStatus.ACTIVE,
          },
        }),
      );
      expect(result.schoolId).toBe(schoolA);
      expect(result.status).toBe(MembershipStatus.ACTIVE);
    });
  });

  describe('updateMembership', () => {
    it('rejects when no membership exists for the active school', async () => {
      prisma.schoolMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMembership(schoolA, 'user-1', MembershipStatus.ACTIVE),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to deactivate the last active school administrator', async () => {
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.ACTIVE,
      });
      prisma.userRole.findMany.mockResolvedValue([{ userId: 'user-1' }]);

      await expect(
        service.updateMembership(schoolA, 'user-1', MembershipStatus.INACTIVE),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deactivates when another active administrator remains', async () => {
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.ACTIVE,
      });
      prisma.userRole.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      prisma.schoolMembership.update.mockResolvedValue({
        userId: 'user-1',
        schoolId: schoolA,
        status: MembershipStatus.INACTIVE,
        joinedAt: new Date('2024-01-01'),
      });

      const result = await service.updateMembership(
        schoolA,
        'user-1',
        MembershipStatus.INACTIVE,
      );

      expect(prisma.userRole.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            schoolId: schoolA,
            role: { name: 'SCHOOL_ADMIN' },
            user: {
              memberships: {
                some: { schoolId: schoolA, status: MembershipStatus.ACTIVE },
              },
            },
          },
        }),
      );
      expect(prisma.schoolMembership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: MembershipStatus.INACTIVE },
        }),
      );
      expect(result.status).toBe(MembershipStatus.INACTIVE);
    });

    it('activates a membership without applying the admin self-protection', async () => {
      prisma.schoolMembership.findUnique.mockResolvedValue({
        status: MembershipStatus.INACTIVE,
      });
      prisma.schoolMembership.update.mockResolvedValue({
        userId: 'user-1',
        schoolId: schoolA,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date('2024-01-01'),
      });

      const result = await service.updateMembership(
        schoolA,
        'user-1',
        MembershipStatus.ACTIVE,
      );

      expect(prisma.userRole.findMany).not.toHaveBeenCalled();
      expect(result.status).toBe(MembershipStatus.ACTIVE);
    });
  });
});
