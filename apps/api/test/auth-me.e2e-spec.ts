import { INestApplication, ValidationPipe } from '@nestjs/common';
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
import { PasswordService } from '../src/modules/identity/services/password.service';

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
  roleName: string;
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
                name: role.roleName,
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

describe('Auth /me (e2e)', () => {
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
            roleName: 'TEACHER',
            permissionKeys: ['students.read', 'grades.enter'],
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
        userRoles: [
          {
            schoolId: schoolA.id,
            roleScope: RoleScope.SCHOOL,
            roleName: 'TEACHER',
            permissionKeys: ['students.read'],
          },
          {
            schoolId: schoolB.id,
            roleScope: RoleScope.SCHOOL,
            roleName: 'TEACHER',
            // grades.approve only in School B — must never leak into School A
            permissionKeys: ['grades.approve'],
          },
        ],
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        email: 'sysadmin@platform.example',
        fullName: 'System Admin With School',
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
            schoolId: null,
            roleScope: RoleScope.SYSTEM,
            roleName: 'SUPER_ADMIN',
            permissionKeys: ['schools.create'],
          },
          {
            schoolId: schoolA.id,
            roleScope: RoleScope.SCHOOL,
            roleName: 'TEACHER',
            permissionKeys: ['students.read'],
          },
        ],
      },
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        email: 'super@platform.example',
        fullName: 'Platform Super Admin',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [],
        userRoles: [
          {
            schoolId: null,
            roleScope: RoleScope.SYSTEM,
            roleName: 'SUPER_ADMIN',
            permissionKeys: ['schools.create', 'schools.delete'],
          },
        ],
      },
    ];

    const prismaMock = createPrismaMock(() => users);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

  it('rejects GET /auth/me without a JWT', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('returns the authenticated user with roles and permissions resolved from the database', async () => {
    const token = await loginAs('teacher-a@school.example');

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      email: 'teacher-a@school.example',
      fullName: 'Teacher School A',
      activeSchoolId: schoolA.id,
      roleNames: ['TEACHER'],
      permissionKeys: ['students.read', 'grades.enter'],
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('returns SYSTEM role permissions when no school is active', async () => {
    const token = await loginAs('super@platform.example');

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.activeSchoolId).toBeNull();
    expect(response.body.roleNames).toEqual(['SUPER_ADMIN']);
    expect(response.body.permissionKeys).toEqual(
      expect.arrayContaining(['schools.create', 'schools.delete']),
    );
  });

  it('combines SYSTEM role and active-school role permissions inside a tenant context', async () => {
    const token = await loginAs('sysadmin@platform.example');

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.activeSchoolId).toBe(schoolA.id);
    expect(response.body.roleNames).toEqual(
      expect.arrayContaining(['SUPER_ADMIN', 'TEACHER']),
    );
    expect(response.body.permissionKeys).toEqual(
      expect.arrayContaining(['schools.create', 'students.read']),
    );
  });

  it('does not leak School A permissions when the active school is School B', async () => {
    const loginToken = await loginAs('multi@school.example');
    const token = await selectSchool(loginToken, schoolB.id);

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.activeSchoolId).toBe(schoolB.id);
    expect(response.body.permissionKeys).toEqual(['grades.approve']);
    expect(response.body.permissionKeys).not.toContain('students.read');
    expect(response.body.roleNames).toEqual(['TEACHER']);
  });

  it('never exposes the password hash', async () => {
    const token = await loginAs('teacher-a@school.example');

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain(passwordHash);
  });

  it('does not trust roles or permissions embedded in the JWT', async () => {
    // A forged token carrying roles/permissions must be ignored — the database
    // resolves the real context.
    const token = await jwtService.signAsync({
      sub: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      activeSchoolId: schoolA.id,
      roleNames: ['SUPER_ADMIN'],
      permissionKeys: ['schools.delete'],
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.roleNames).toEqual(['TEACHER']);
    expect(response.body.permissionKeys).toEqual([
      'students.read',
      'grades.enter',
    ]);
    expect(response.body.permissionKeys).not.toContain('schools.delete');
  });
});