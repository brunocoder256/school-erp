import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  MembershipStatus,
  UserStatus,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-request';
import {
  AuthLoginResult,
  AuthMeResult,
  AuthSchoolSummary,
  JwtPayload,
} from '../types/jwt-payload';
import { PasswordService } from './password.service';
import { PermissionService } from './permission.service';

const INVALID_CREDENTIALS = 'Invalid credentials';

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly permissionService: PermissionService,
  ) {}

  async login(email: string, password: string): Promise<AuthLoginResult> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          where: { status: MembershipStatus.ACTIVE },
          include: {
            school: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const passwordValid = await this.passwordService.verify(
      user.passwordHash,
      password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const schools = user.memberships.map((membership) => membership.school);
    const { activeSchoolId, requiresSchoolSelection } =
      this.resolveActiveSchool(schools);

    const accessToken = await this.signAccessToken(user.id, activeSchoolId);

    return {
      accessToken,
      tokenType: 'Bearer',
      requiresSchoolSelection,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        activeSchoolId,
      },
      schools,
    };
  }

  async selectSchool(
    userId: string,
    schoolId: string,
  ): Promise<AuthLoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { status: MembershipStatus.ACTIVE },
          include: {
            school: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const membership = user.memberships.find(
      (item) => item.schoolId === schoolId,
    );

    if (!membership) {
      throw new ForbiddenException(
        'You do not have an active membership for this school.',
      );
    }

    const schools = user.memberships.map((item) => item.school);
    const accessToken = await this.signAccessToken(user.id, schoolId);

    return {
      accessToken,
      tokenType: 'Bearer',
      requiresSchoolSelection: false,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        activeSchoolId: schoolId,
      },
      schools,
    };
  }

  /**
   * Safe representation of the authenticated user with roles and permissions
   * resolved from the database for the active school context.
   *
   * Never returns passwordHash or raw authorization records. `roleNames` and
   * `permissionKeys` are populated by PermissionService, never from the JWT.
   */
  async me(user: AuthenticatedUser): Promise<AuthMeResult> {
    const context = await this.permissionService.resolveActiveContext(
      user.id,
      user.activeSchoolId,
    );

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      activeSchoolId: user.activeSchoolId,
      roleNames: context?.roleNames ?? [],
      permissionKeys: context?.permissionKeys ?? [],
    };
  }

  private resolveActiveSchool(schools: AuthSchoolSummary[]): {
    activeSchoolId: string | null;
    requiresSchoolSelection: boolean;
  } {
    if (schools.length === 0) {
      return { activeSchoolId: null, requiresSchoolSelection: false };
    }

    if (schools.length === 1) {
      return {
        activeSchoolId: schools[0].id,
        requiresSchoolSelection: false,
      };
    }

    return { activeSchoolId: null, requiresSchoolSelection: true };
  }

  private signAccessToken(
    userId: string,
    activeSchoolId: string | null,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      activeSchoolId,
    };

    const expiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') ?? '1d';

    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: expiresIn as `${number}d` | `${number}h` | `${number}m` | `${number}s`,
    });
  }
}
