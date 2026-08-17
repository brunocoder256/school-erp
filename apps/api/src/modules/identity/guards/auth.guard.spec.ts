import {
  Controller,
  Get,
  INestApplication,
  UseGuards,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { UserStatus } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { AuthGuard } from './auth.guard';

@Controller('auth-guard-test')
class AuthGuardTestController {
  @Get('protected')
  @UseGuards(AuthGuard)
  protectedRoute() {
    return { ok: true };
  }
}

describe('AuthGuard (JWT)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
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
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'unit-test-jwt-secret',
              JWT_EXPIRES_IN: '1h',
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            secret: config.getOrThrow<string>('JWT_SECRET'),
            signOptions: { expiresIn: '1h' },
          }),
        }),
      ],
      controllers: [AuthGuardTestController],
      providers: [
        AuthGuard,
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    jwtService = module.get(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('authenticates a valid token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'teacher@example.com',
      fullName: 'Jane Teacher',
      status: UserStatus.ACTIVE,
    });

    const token = await jwtService.signAsync({
      sub: 'user-1',
      activeSchoolId: null,
    });

    await request(app.getHttpServer())
      .get('/auth-guard-test/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ ok: true });
  });

  it('rejects a missing token', async () => {
    await request(app.getHttpServer())
      .get('/auth-guard-test/protected')
      .expect(401);
  });

  it('rejects a malformed token', async () => {
    await request(app.getHttpServer())
      .get('/auth-guard-test/protected')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
  });

  it('rejects an expired token', async () => {
    const token = await jwtService.signAsync(
      { sub: 'user-1', activeSchoolId: null },
      { expiresIn: -1 },
    );

    await request(app.getHttpServer())
      .get('/auth-guard-test/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('rejects a deleted or nonexistent user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const token = await jwtService.signAsync({
      sub: 'missing-user',
      activeSchoolId: null,
    });

    await request(app.getHttpServer())
      .get('/auth-guard-test/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
