import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  MembershipStatus,
  UserStatus,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { JwtStrategy } from '../strategies/jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: {
    user: { findUnique: jest.Mock };
    schoolMembership: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      schoolMembership: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  it('attaches an authenticated user for a valid token payload', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'teacher@example.com',
      fullName: 'Jane Teacher',
      status: UserStatus.ACTIVE,
    });
    prisma.schoolMembership.findUnique.mockResolvedValue({
      status: MembershipStatus.ACTIVE,
    });

    const user = await strategy.validate({
      sub: 'user-1',
      activeSchoolId: 'school-a',
    });

    expect(user).toEqual({
      id: 'user-1',
      email: 'teacher@example.com',
      fullName: 'Jane Teacher',
      activeSchoolId: 'school-a',
      roleNames: [],
      permissionKeys: [],
    });
  });

  it('rejects a missing subject', async () => {
    await expect(
      strategy.validate({ sub: '', activeSchoolId: null }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a nonexistent user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'missing', activeSchoolId: null }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'teacher@example.com',
      fullName: 'Jane Teacher',
      status: UserStatus.SUSPENDED,
    });

    await expect(
      strategy.validate({ sub: 'user-1', activeSchoolId: null }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid school membership claim', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'teacher@example.com',
      fullName: 'Jane Teacher',
      status: UserStatus.ACTIVE,
    });
    prisma.schoolMembership.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'user-1', activeSchoolId: 'school-x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
