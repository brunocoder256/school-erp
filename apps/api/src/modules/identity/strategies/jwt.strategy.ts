import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  MembershipStatus,
  UserStatus,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-request';
import { JwtPayload } from '../types/jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid authentication token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid authentication token.');
    }

    let activeSchoolId: string | null = payload.activeSchoolId ?? null;

    if (activeSchoolId) {
      const membership = await this.prisma.schoolMembership.findUnique({
        where: {
          userId_schoolId: {
            userId: user.id,
            schoolId: activeSchoolId,
          },
        },
        select: { status: true },
      });

      if (!membership || membership.status !== MembershipStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid school context.');
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      activeSchoolId,
      roleNames: [],
      permissionKeys: [],
    };
  }
}
