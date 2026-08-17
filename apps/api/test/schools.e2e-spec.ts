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
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
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

function createPrismaMock(
  getUsers: () => UserFixture[],
  getSchools: () => SchoolFixture[],
) {
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
    school: {
      findUnique: jest.fn(
        async (args: {
          where: { id?: string; code?: string };
          select?: unknown;
        }) => {
          const schools = getSchools();

          if (args.where.id) {
            return schools.find((item) => item.id === args.where.id) ?? null;
          }

          if (args.where.code) {
            return (
              schools.find((item) => item.code === args.where.code) ?? null
            );
          }

          return null;
        },
      ),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: Partial<SchoolFixture>;
          select?: unknown;
        }) => {
          const schools = getSchools();
          const school = schools.find(
            (item) => item.id === args.where.id,
          ) as SchoolFixture;

          return { ...school, ...args.data };
        },
      ),
      create: jest.fn(
        async (args: { data: Partial<SchoolFixture>; select?: unknown }) => {
          const schools = getSchools();
          const school: SchoolFixture = {
            id: 'school-new',
            name: args.data.name ?? 'New School',
            code: args.data.code ?? 'NEW',
            description: args.data.description ?? null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          };

          schools.push(school);

          return school;
        },
      ),
    },
  };
}

describe('Schools (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let users: UserFixture[];
  let schools: SchoolFixture[];
  let passwordHash: string;

  const schoolA: SchoolFixture = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Kampala Primary',
    code: 'KLA-P',
    description: 'Primary school in Kampala',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
  const schoolB: SchoolFixture = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Entebbe Secondary',
    code: 'EBB-S',
    description: 'Secondary school in Entebbe',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const password = 'SecurePass123!';

  beforeAll(async () => {
    passwordHash = await new PasswordService().hash(password);
  });

  beforeEach(async () => {
    schools = [schoolA, schoolB];

    users = [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        email: 'admin-a@school.example',
        fullName: 'Admin School A',
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
            roleName: 'SCHOOL_ADMIN',
            permissionKeys: ['schools.read', 'schools.update'],
          },
        ],
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        email: 'admin-ab@school.example',
        fullName: 'Admin Schools A and B',
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
            roleName: 'SCHOOL_ADMIN',
            permissionKeys: ['schools.read', 'schools.update'],
          },
          {
            schoolId: schoolB.id,
            roleScope: RoleScope.SCHOOL,
            roleName: 'SCHOOL_ADMIN',
            permissionKeys: ['schools.read', 'schools.update'],
          },
        ],
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        email: 'no-perms@school.example',
        fullName: 'No Permissions User',
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
            roleName: 'STUDENT',
            permissionKeys: [],
          },
        ],
      },
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        email: 'inactive-a@school.example',
        fullName: 'Inactive Membership User',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          {
            schoolId: schoolA.id,
            status: MembershipStatus.INACTIVE,
            school: schoolA,
            joinedAt: new Date('2024-01-01'),
          },
        ],
        userRoles: [
          {
            schoolId: schoolA.id,
            roleScope: RoleScope.SCHOOL,
            roleName: 'SCHOOL_ADMIN',
            permissionKeys: ['schools.read'],
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
            roleName: 'SUPER_ADMIN',
            permissionKeys: ['schools.read', 'schools.update', 'schools.create'],
          },
        ],
      },
    ];

    const prismaMock = createPrismaMock(() => users, () => schools);

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

  describe('authentication', () => {
    it('rejects GET /schools/me without a JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/schools/me')
        .expect(401);
    });

    it('rejects POST /schools without a JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/schools')
        .send({ name: 'New School', code: 'NEW' })
        .expect(401);
    });
  });

  describe('authorization', () => {
    it('allows GET /schools/me with the seeded schools.read permission', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/schools/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(schoolA.id);
      expect(response.body.name).toBe('Kampala Primary');
      expect(response.body.code).toBe('KLA-P');
    });

    it('rejects GET /schools/me when schools.read is missing', async () => {
      const token = await loginAs('no-perms@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/schools/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have permission to perform this action.',
      );
    });

    it('rejects PATCH /schools/me when schools.update is missing', async () => {
      const token = await loginAs('no-perms@school.example');

      const response = await request(app.getHttpServer())
        .patch('/api/v1/schools/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' })
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have permission to perform this action.',
      );
    });

    it('rejects POST /schools without the system-level schools.create permission', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/schools')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New School', code: 'NEW' })
        .expect(403);
    });
  });

  describe('membership', () => {
    it('rejects a token whose active school membership is inactive', async () => {
      const token = await jwtService.signAsync({
        sub: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        activeSchoolId: schoolA.id,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/schools/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      // JwtStrategy re-verifies the ACTIVE membership and rejects the context
      // before the handler runs. The service-level ForbiddenException for an
      // inactive membership is defense-in-depth, covered in unit tests.
      expect(response.body.message).toBe('Invalid school context.');
    });

    it('allows an authenticated user with an ACTIVE membership', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/schools/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(schoolA.id);
    });
  });

  describe('no active school context', () => {
    it('rejects GET /schools/me when no active school exists even with schools.read', async () => {
      const token = await loginAs('super@platform.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/schools/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'Active school context is required for this operation.',
      );
    });
  });

  describe('tenant isolation', () => {
    it('returns only the active school (A), never School B', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const token = await selectSchool(loginToken, schoolA.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/schools/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(schoolA.id);
      expect(response.body.code).toBe('KLA-P');
      expect(response.body.id).not.toBe(schoolB.id);
      expect(response.body.code).not.toBe('EBB-S');
    });

    it('ignores a client-supplied school id in the request body', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const token = await selectSchool(loginToken, schoolA.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/schools/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ schoolId: schoolB.id })
        .expect(200);

      expect(response.body.id).toBe(schoolA.id);
    });

    it('ignores a client-supplied school id as a query parameter', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const token = await selectSchool(loginToken, schoolA.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/schools/me')
        .set('Authorization', `Bearer ${token}`)
        .query({ schoolId: schoolB.id })
        .expect(200);

      expect(response.body.id).toBe(schoolA.id);
    });

    it('ignores a client-supplied school id via a custom header', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const token = await selectSchool(loginToken, schoolA.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/schools/me')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Active-School', schoolB.id)
        .expect(200);

      expect(response.body.id).toBe(schoolA.id);
    });

    it('updates only the active school', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const token = await selectSchool(loginToken, schoolA.id);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/schools/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Renamed Kampala Primary' })
        .expect(200);

      expect(response.body.id).toBe(schoolA.id);
      expect(response.body.name).toBe('Renamed Kampala Primary');
      expect(response.body.code).toBe('KLA-P');
    });

    it('rejects a school id field in the update body (forbidden field)', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const token = await selectSchool(loginToken, schoolA.id);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/schools/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ schoolId: schoolB.id, name: 'Hacked' })
        .expect(400);

      expect(response.body.message).toEqual(expect.any(Array));
    });
  });

  describe('school creation', () => {
    it('allows a SYSTEM user with schools.create to create a school', async () => {
      const token = await loginAs('super@platform.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/schools')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Kampala School', code: 'new-kla' })
        .expect(201);

      expect(response.body.id).toBe('school-new');
      expect(response.body.code).toBe('NEW-KLA');
    });

    it('does not invent memberships or roles when creating a school', async () => {
      const token = await loginAs('super@platform.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/schools')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Another School', code: 'ANOTHER' })
        .expect(201);

      expect(response.body).not.toHaveProperty('memberships');
      expect(response.body).not.toHaveProperty('userRoles');
    });
  });
});