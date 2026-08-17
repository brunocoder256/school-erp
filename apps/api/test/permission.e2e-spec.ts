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
  RoleScope,
  UserStatus,
} from '../generated/prisma/enums';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { Permissions } from '../src/modules/identity/decorators/permissions.decorator';
import { AuthGuard } from '../src/modules/identity/guards/auth.guard';
import { PermissionGuard } from '../src/modules/identity/guards/permission.guard';
import { PasswordService } from '../src/modules/identity/services/password.service';
import { PermissionService } from '../src/modules/identity/services/permission.service';

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

type UserRoleFixture = {
  schoolId: string | null;
  roleScope: (typeof RoleScope)[keyof typeof RoleScope];
  permissionKeys: string[];
};

type UserFixture = {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  status: (typeof UserStatus)[keyof typeof UserStatus];
  memberships: MembershipFixture[];
  userRoles: UserRoleFixture[];
};

/**
 * Test-only probe — registered solely in this e2e suite, not in production modules.
 */
@Controller('permission-e2e')
class PermissionE2eProbeController {
  @Get('students-read')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.read')
  studentsRead() {
    return { ok: true, action: 'students.read' };
  }

  @Get('grades-write')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('grades.enter', 'grades.update')
  gradesWrite() {
    return { ok: true, action: 'grades.write' };
  }

  @Get('grades-approve')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('grades.approve')
  gradesApprove() {
    return { ok: true, action: 'grades.approve' };
  }

  @Get('schools-create')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('schools.create')
  schoolsCreate() {
    return { ok: true, action: 'schools.create' };
  }

  @Get('authenticated-only')
  @UseGuards(AuthGuard, PermissionGuard)
  authenticatedOnly() {
    return { ok: true, action: 'authenticated-only' };
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
              .filter(
                (membership) => membership.status === MembershipStatus.ACTIVE,
              )
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
    userRole: {
      findMany: jest.fn(
        async (args: {
          where: {
            userId: string;
            OR: Array<{
              schoolId: string | null;
              role: { scope: (typeof RoleScope)[keyof typeof RoleScope] };
            }>;
          };
          select?: unknown;
        }) => {
          const users = getUsers();
          const user = users.find((item) => item.id === args.where.userId);

          if (!user) {
            return [];
          }

          const clauses = args.where.OR ?? [];

          return user.userRoles
            .filter((role) =>
              clauses.some(
                (clause) =>
                  clause.schoolId === role.schoolId &&
                  clause.role.scope === role.roleScope,
              ),
            )
            .map((role) => ({
              role: {
                rolePermissions: role.permissionKeys.map((key) => ({
                  permission: { key },
                })),
              },
            }));
        },
      ),
    },
  };
}

describe('Authorization / PermissionGuard (e2e)', () => {
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

  const password = 'SecurePass123!';

  beforeAll(async () => {
    passwordHash = await new PasswordService().hash(password);
  });

  beforeEach(async () => {
    users = [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        email: 'teacher-a@school.example',
        fullName: 'Teacher School A',
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
        userRoles: [
          {
            schoolId: schoolA.id,
            roleScope: RoleScope.SCHOOL,
            permissionKeys: [
              'students.read',
              'grades.enter',
              'grades.update',
              'attendance.read',
            ],
          },
        ],
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        email: 'student-a@school.example',
        fullName: 'Student School A',
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
        userRoles: [
          {
            schoolId: schoolA.id,
            roleScope: RoleScope.SCHOOL,
            permissionKeys: ['students.read', 'grades.read'],
          },
        ],
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
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
        userRoles: [
          {
            schoolId: schoolA.id,
            roleScope: RoleScope.SCHOOL,
            permissionKeys: ['students.read'],
          },
          {
            schoolId: schoolB.id,
            roleScope: RoleScope.SCHOOL,
            // grades.approve only in School B — must not leak into School A
            permissionKeys: ['students.read', 'grades.approve'],
          },
        ],
      },
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        email: 'multi-role@school.example',
        fullName: 'Multi Role User',
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
        userRoles: [
          {
            schoolId: schoolA.id,
            roleScope: RoleScope.SCHOOL,
            permissionKeys: ['students.read'],
          },
          {
            schoolId: schoolA.id,
            roleScope: RoleScope.SCHOOL,
            permissionKeys: ['grades.enter', 'grades.update'],
          },
        ],
      },
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        email: 'super@platform.example',
        fullName: 'Platform Super Admin',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [],
        userRoles: [
          {
            schoolId: null,
            roleScope: RoleScope.SYSTEM,
            permissionKeys: ['schools.create', 'schools.delete', 'students.read'],
          },
        ],
      },
    ];

    const prismaMock = createPrismaMock(() => users);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [PermissionE2eProbeController],
      // Probe controller lives outside IdentityModule; register guard deps here.
      providers: [PermissionGuard, PermissionService],
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

  async function loginAs(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body.accessToken as string;
  }

  async function selectSchool(token: string, schoolId: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/select-school')
      .set('Authorization', `Bearer ${token}`)
      .send({ schoolId })
      .expect(201);

    return response.body.accessToken as string;
  }

  describe('permission allowed / denied', () => {
    it('returns 200 when the user has the required permission', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/students-read')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect({ ok: true, action: 'students.read' });
    });

    it('returns 403 when the user lacks the required permission', async () => {
      const token = await loginAs('student-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/grades-write')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have permission to perform this action.',
      );
    });
  });

  describe('multiple permissions (AND)', () => {
    it('returns 200 when the user has every required permission', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/grades-write')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect({ ok: true, action: 'grades.write' });
    });

    it('returns 403 when one of the required permissions is missing', async () => {
      const token = await loginAs('student-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/grades-write')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('authentication vs authorization', () => {
    it('returns 401 when no JWT is provided', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/students-read')
        .expect(401);
    });

    it('allows an authenticated route with no @Permissions metadata', async () => {
      const token = await loginAs('student-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/authenticated-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect({ ok: true, action: 'authenticated-only' });
    });
  });

  describe('cross-school isolation', () => {
    it('denies a School-B-only permission while activeSchoolId is School A', async () => {
      const loginToken = await loginAs('multi@school.example');
      const schoolAToken = await selectSchool(loginToken, schoolA.id);

      await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/grades-approve')
        .set('Authorization', `Bearer ${schoolAToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/students-read')
        .set('Authorization', `Bearer ${schoolAToken}`)
        .expect(200);
    });

    it('allows the same School-B-only permission after selecting School B', async () => {
      const loginToken = await loginAs('multi@school.example');
      const schoolBToken = await selectSchool(loginToken, schoolB.id);

      await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/grades-approve')
        .set('Authorization', `Bearer ${schoolBToken}`)
        .expect(200)
        .expect({ ok: true, action: 'grades.approve' });

      const payload = jwtService.decode(schoolBToken) as {
        activeSchoolId: string;
        permissionKeys?: unknown;
        roleNames?: unknown;
      };
      expect(payload.activeSchoolId).toBe(schoolB.id);
      expect(payload.permissionKeys).toBeUndefined();
      expect(payload.roleNames).toBeUndefined();
    });
  });

  describe('multiple roles (union)', () => {
    it('grants the union of permissions from multiple school roles', async () => {
      const token = await loginAs('multi-role@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/students-read')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/grades-write')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('SYSTEM role behavior', () => {
    it('allows platform permissions with null activeSchoolId via SYSTEM role', async () => {
      const token = await loginAs('super@platform.example');

      const payload = jwtService.decode(token) as {
        activeSchoolId: string | null;
      };
      expect(payload.activeSchoolId).toBeNull();

      await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/schools-create')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect({ ok: true, action: 'schools.create' });
    });

    it('does not invent school membership for a SYSTEM actor without one', async () => {
      const token = await loginAs('super@platform.example');

      // students.read is assigned on the SYSTEM role in this fixture (mirrors seed:
      // SUPER_ADMIN receives all keys). With null activeSchoolId, SYSTEM roles still apply.
      await request(app.getHttpServer())
        .get('/api/v1/permission-e2e/students-read')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
