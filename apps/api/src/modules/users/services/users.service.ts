import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  MembershipStatus,
  UserStatus,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { PasswordService } from '../../identity/services/password.service';
import { CreateUserDto } from '../dto/create-user.dto';
import {
  MembershipResponse,
  SchoolMemberResponse,
  UserResponse,
} from '../dto/user-response.dto';
import { assertNotLastActiveSchoolAdmin } from './last-school-admin.guard';

/**
 * User and membership administration within the active school context.
 *
 * The school is never supplied by the client — every method receives the
 * authenticated user's activeSchoolId. Membership lookups are always scoped
 * through the (userId, schoolId) composite key, so a user from another school
 * is indistinguishable from a nonexistent one.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Creates a user account only. No membership and no roles are invented.
   * Membership and role assignment remain explicit operations.
   */
  async createUser(dto: CreateUserDto): Promise<UserResponse> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    try {
      return await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName: dto.fullName.trim(),
          status: UserStatus.ACTIVE,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists.');
      }

      throw error;
    }
  }

  /**
   * Lists every member of the active school. Only memberships where
   * schoolId = activeSchoolId are queried.
   */
  async listMembers(activeSchoolId: string): Promise<SchoolMemberResponse[]> {
    const memberships = await this.prisma.schoolMembership.findMany({
      where: { schoolId: activeSchoolId },
      select: {
        status: true,
        joinedAt: true,
        user: {
          select: { id: true, email: true, fullName: true, status: true },
        },
        userRoles: {
          select: { role: { select: { name: true } } },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((membership) => ({
      userId: membership.user.id,
      email: membership.user.email,
      fullName: membership.user.fullName,
      userStatus: membership.user.status,
      membershipStatus: membership.status,
      joinedAt: membership.joinedAt,
      roleNames: membership.userRoles.map((userRole) => userRole.role.name),
    }));
  }

  /**
   * Returns one member of the active school. A user without a membership for
   * the active school is reported as not found — the caller cannot distinguish
   * a foreign-school user from a nonexistent one.
   */
  async getMember(
    activeSchoolId: string,
    userId: string,
  ): Promise<SchoolMemberResponse> {
    const membership = await this.prisma.schoolMembership.findUnique({
      where: {
        userId_schoolId: { userId, schoolId: activeSchoolId },
      },
      select: {
        status: true,
        joinedAt: true,
        user: {
          select: { id: true, email: true, fullName: true, status: true },
        },
        userRoles: {
          select: { role: { select: { name: true } } },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this school.');
    }

    return {
      userId: membership.user.id,
      email: membership.user.email,
      fullName: membership.user.fullName,
      userStatus: membership.user.status,
      membershipStatus: membership.status,
      joinedAt: membership.joinedAt,
      roleNames: membership.userRoles.map((userRole) => userRole.role.name),
    };
  }

  /**
   * Adds an existing user to the active school with an ACTIVE membership.
   * Roles are never invented here.
   */
  async createMembership(
    activeSchoolId: string,
    userId: string,
  ): Promise<MembershipResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ConflictException(
        'Only active users can be added to a school.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.schoolMembership.findUnique({
        where: {
          userId_schoolId: { userId, schoolId: activeSchoolId },
        },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException('User is already a member of this school.');
      }

      return tx.schoolMembership.create({
        data: {
          userId,
          schoolId: activeSchoolId,
          status: MembershipStatus.ACTIVE,
        },
        select: {
          userId: true,
          schoolId: true,
          status: true,
          joinedAt: true,
        },
      });
    });
  }

  /**
   * Activates or deactivates a membership within the active school.
   *
   * Deactivating is refused when the target is the last active school
   * administrator (self-protection). JwtStrategy re-checks ACTIVE membership
   * on every request, so deactivation invalidates that school context on the
   * user's next authenticated call.
   */
  async updateMembership(
    activeSchoolId: string,
    userId: string,
    status: MembershipStatus,
  ): Promise<MembershipResponse> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.schoolMembership.findUnique({
        where: {
          userId_schoolId: { userId, schoolId: activeSchoolId },
        },
        select: { status: true },
      });

      if (!existing) {
        throw new NotFoundException('Membership not found in this school.');
      }

      if (status === MembershipStatus.INACTIVE) {
        await assertNotLastActiveSchoolAdmin(tx, activeSchoolId, userId);
      }

      return tx.schoolMembership.update({
        where: {
          userId_schoolId: { userId, schoolId: activeSchoolId },
        },
        data: { status },
        select: {
          userId: true,
          schoolId: true,
          status: true,
          joinedAt: true,
        },
      });
    });
  }
}
