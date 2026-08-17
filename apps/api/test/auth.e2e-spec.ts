import {
  Controller,
  Get,
  INestApplication,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  MembershipStatus,
  UserStatus,
} from '../generated/prisma/enums';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { CurrentUser } from '../src/modules/identity/decorators/current-user.decorator';
import { AuthGuard } from '../src/modules/identity/guards/auth.guard';
import { PasswordService } from '../src/modules/identity/services/password.service';
import { AuthenticatedUser } from '../src/modules/identity/types/authenticated-request';

type SchoolFixture = {
  id: string;
  name: string;
  code: string;
};

type MembershipFixture = {
  schoolId: string;
  status: (typeof MembershipStatus)[keyof typeof MembershipStatus];
  school: SchoolFixture;
  joinedAt: Date;
};

type UserFixture = {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  status: (typeof UserStatus)[keyof typeof UserStatus];
  memberships: MembershipFixture[];
};

/**
 * Test-only probe — registered solely in this e2e suite, not in production modules.
 */
@Controller('auth-e2e')
class AuthE2eProbeController {
  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}

function createPrismaMock(getUsers: () => UserFixture[]) {
  return {
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    user: {
      findUnique: jest.fn(
        async (args: {
          where: { email?: string; id?: string };
          include?: unknown;
          select?: unknown;
        }) => {
          const users = getUsers();
          const user = args.where.email
            ? users.find((item) => item.email === args.where.email)
            : users.find((item) => item.id === args.where.id);

          if (!user) {
            return null;
          }

          if (args.select) {
            return {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              status: user.status,
            };
          }

          return {
            ...user,
            memberships: user.memberships
              .filter((membership) => membership.status === MembershipStatus.ACTIVE)
              .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
              .map((membership) => ({
                schoolId: membership.schoolId,
                status: membership.status,
                school: membership.school,
              })),
          };
        },
      ),
    },
    schoolMembership: {
      findUnique: jest.fn(
        async (args: {
          where: { userId_schoolId: { userId: string; schoolId: string } };
          select?: { status: true };
        }) => {
          const users = getUsers();
          const user = users.find(
            (item) => item.id === args.where.userId_schoolId.userId,
          );
          const membership = user?.memberships.find(
            (item) => item.schoolId === args.where.userId_schoolId.schoolId,
          );

          if (!membership) {
            return null;
          }

          return { status: membership.status };
        },
      ),
    },
  };
}

describe('Authentication (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let users: UserFixture[];
  let passwordHash: string;

  const schoolA: SchoolFixture = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Kampala Primary',
    code: 'KLA-P',
  };
  const schoolB: SchoolFixture = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Entebbe Secondary',
    code: 'EBB-S',
  };
  const foreignSchoolId = '33333333-3333-4333-8333-333333333333';

  const password = 'SecurePass123!';

  beforeAll(async () => {
    passwordHash = await new PasswordService().hash(password);
  });

  beforeEach(async () => {
    users = [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        email: 'single@school.example',
        fullName: 'Single School User',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          {
            schoolId: schoolA.id,
            status: MembershipStatus.ACTIVE,
            school: schoolA,
            joinedAt: new Date('2024-01-01'),
          },
        ],
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        email: 'multi@school.example',
        fullName: 'Multi School User',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          {
            schoolId: schoolA.id,
            status: MembershipStatus.ACTIVE,
            school: schoolA,
            joinedAt: new Date('2024-01-01'),
          },
          {
            schoolId: schoolB.id,
            status: MembershipStatus.ACTIVE,
            school: schoolB,
            joinedAt: new Date('2024-02-01'),
          },
        ],
      },
    ];

    const prismaMock = createPrismaMock(() => users);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AuthE2eProbeController],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    jwtService = moduleFixture.get(JwtService);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/auth/login', () => {
    it('authenticates a valid active user and returns an access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'single@school.example',
          password,
        })
        .expect(201);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.tokenType).toBe('Bearer');
      expect(response.body.requiresSchoolSelection).toBe(false);
      expect(response.body.user).toEqual({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        email: 'single@school.example',
        fullName: 'Single School User',
        activeSchoolId: schoolA.id,
      });
      expect(response.body.schools).toEqual([schoolA]);
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
      expect(JSON.stringify(response.body)).not.toContain(passwordHash);

      const payload = jwtService.decode(response.body.accessToken) as {
        sub: string;
        activeSchoolId: string | null;
        roleNames?: unknown;
        permissionKeys?: unknown;
      };

      expect(payload.sub).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      expect(payload.activeSchoolId).toBe(schoolA.id);
      expect(payload.roleNames).toBeUndefined();
      expect(payload.permissionKeys).toBeUndefined();
    });

    it('rejects an incorrect password with a safe failure', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'single@school.example',
          password: 'WrongPassword1!',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('rejects an unknown email with the same safe failure', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'missing@school.example',
          password,
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('requires school selection when the user has multiple active memberships', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'multi@school.example',
          password,
        })
        .expect(201);

      expect(response.body.requiresSchoolSelection).toBe(true);
      expect(response.body.user.activeSchoolId).toBeNull();
      expect(response.body.schools).toEqual([schoolA, schoolB]);
      expect(response.body.accessToken).toEqual(expect.any(String));
    });
  });

  describe('POST /api/v1/auth/select-school', () => {
    it('rejects a school the user does not belong to', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'multi@school.example',
          password,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/select-school')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ schoolId: foreignSchoolId })
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have an active membership for this school.',
      );
    });

    it('issues a token with server-verified activeSchoolId for a valid membership', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'multi@school.example',
          password,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/select-school')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ schoolId: schoolB.id })
        .expect(201);

      expect(response.body.requiresSchoolSelection).toBe(false);
      expect(response.body.user.activeSchoolId).toBe(schoolB.id);

      const payload = jwtService.decode(response.body.accessToken) as {
        activeSchoolId: string;
      };
      expect(payload.activeSchoolId).toBe(schoolB.id);
    });
  });

  describe('AuthGuard + CurrentUser (test-only probe)', () => {
    it('rejects a missing bearer token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth-e2e/me')
        .expect(401);
    });

    it('rejects an invalid bearer token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth-e2e/me')
        .set('Authorization', 'Bearer not-a-valid-jwt')
        .expect(401);
    });

    it('attaches AuthenticatedUser for a valid JWT', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'single@school.example',
          password,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth-e2e/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      expect(response.body).toEqual({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        email: 'single@school.example',
        fullName: 'Single School User',
        activeSchoolId: schoolA.id,
        roleNames: [],
        permissionKeys: [],
      });
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('uses server-controlled school context from the token, not a client body field', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'single@school.example',
          password,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth-e2e/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ activeSchoolId: foreignSchoolId })
        .expect(200);

      expect(response.body.activeSchoolId).toBe(schoolA.id);
      expect(response.body.activeSchoolId).not.toBe(foreignSchoolId);
    });
  });
});
