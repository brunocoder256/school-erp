import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Prisma } from '../generated/prisma/client';
import {
  MembershipStatus,
  RoleScope,
  UserStatus,
} from '../generated/prisma/enums';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/modules/identity/services/password.service';

type Scope = (typeof RoleScope)[keyof typeof RoleScope];
type MembershipStatusValue =
  (typeof MembershipStatus)[keyof typeof MembershipStatus];
type UserStatusValue = (typeof UserStatus)[keyof typeof UserStatus];

type SchoolFixture = {
  id: string;
  name: string;
  code: string;
};

type RoleFixture = {
  id: string;
  name: string;
  scope: Scope;
  permissionKeys: string[];
};

type UserRoleFixture = {
  schoolId: string | null;
  role: RoleFixture;
};

type MembershipFixture = {
  id: string;
  schoolId: string;
  status: MembershipStatusValue;
  joinedAt: Date;
  school: SchoolFixture;
};

type UserFixture = {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  status: UserStatusValue;
  memberships: MembershipFixture[];
  userRoles: UserRoleFixture[];
};

type Select = Record<string, true>;

function pick(select: Select | undefined, source: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (!select) {
    return out;
  }

  for (const key of Object.keys(select)) {
    if (key in source) {
      out[key] = source[key];
    }
  }

  return out;
}

function createPrismaMock(
  getUsers: () => UserFixture[],
  getSchools: () => SchoolFixture[],
  getRoles: () => RoleFixture[],
) {
  const prisma = {
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(prisma),
    ),
    user: {
      findUnique: jest.fn(
        async (args: {
          where: { email?: string; id?: string };
          include?: unknown;
          select?: Select;
        }) => {
          const users = getUsers();
          const user = args.where.email
            ? users.find((item) => item.email === args.where.email)
            : users.find((item) => item.id === args.where.id);

          if (!user) {
            return null;
          }

          if (args.select) {
            return pick(args.select, {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              status: user.status,
            });
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
      create: jest.fn(
        async (args: {
          data: {
            email: string;
            passwordHash: string;
            fullName: string;
            status: UserStatusValue;
          };
          select?: Select;
        }) => {
          const createdAt = new Date('2024-03-01');
          const user: UserFixture = {
            id: '99999999-9998-4998-8998-999999999998',
            email: args.data.email,
            fullName: args.data.fullName,
            passwordHash: args.data.passwordHash,
            status: args.data.status,
            memberships: [],
            userRoles: [],
          };

          getUsers().push(user);

          return pick(args.select, {
            ...user,
            createdAt,
            updatedAt: createdAt,
          });
        },
      ),
    },
    schoolMembership: {
      findUnique: jest.fn(
        async (args: {
          where: {
            userId_schoolId: { userId: string; schoolId: string };
          };
          select: Select;
        }) => {
          const users = getUsers();
          const { userId, schoolId } = args.where.userId_schoolId;
          const user = users.find((item) => item.id === userId);
          const membership = user?.memberships.find(
            (item) => item.schoolId === schoolId,
          );

          if (!membership) {
            return null;
          }

          if ('user' in args.select || 'userRoles' in args.select) {
            return pick(args.select, {
              status: membership.status,
              joinedAt: membership.joinedAt,
              user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                status: user.status,
              },
              userRoles: user.userRoles
                .filter((item) => item.schoolId === schoolId)
                .map((item) => ({ role: { name: item.role.name } })),
            });
          }

          return pick(args.select, {
            id: membership.id,
            status: membership.status,
            joinedAt: membership.joinedAt,
          });
        },
      ),
      findMany: jest.fn(
        async (args: {
          where: { schoolId: string };
          select?: Select;
          orderBy?: unknown;
        }) => {
          const users = getUsers();
          const schoolId = args.where.schoolId;

          return users
            .flatMap((user) =>
              user.memberships
                .filter((membership) => membership.schoolId === schoolId)
                .map((membership) => ({ user, membership })),
            )
            .sort(
              (a, b) =>
                a.membership.joinedAt.getTime() -
                b.membership.joinedAt.getTime(),
            )
            .map(({ user, membership }) => ({
              status: membership.status,
              joinedAt: membership.joinedAt,
              user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                status: user.status,
              },
              userRoles: user.userRoles
                .filter((item) => item.schoolId === schoolId)
                .map((item) => ({ role: { name: item.role.name } })),
            }));
        },
      ),
      create: jest.fn(
        async (args: {
          data: {
            userId: string;
            schoolId: string;
            status: MembershipStatusValue;
          };
          select?: Select;
        }) => {
          const users = getUsers();
          const user = users.find((item) => item.id === args.data.userId);
          const school = getSchools().find(
            (item) => item.id === args.data.schoolId,
          ) as SchoolFixture;
          const membership: MembershipFixture = {
            id: `m-${args.data.userId}-${args.data.schoolId}`,
            schoolId: args.data.schoolId,
            status: args.data.status,
            joinedAt: new Date('2024-03-01'),
            school,
          };

          user?.memberships.push(membership);

          return pick(args.select, {
            userId: args.data.userId,
            schoolId: args.data.schoolId,
            status: membership.status,
            joinedAt: membership.joinedAt,
          });
        },
      ),
      update: jest.fn(
        async (args: {
          where: {
            userId_schoolId: { userId: string; schoolId: string };
          };
          data: { status: MembershipStatusValue };
          select?: Select;
        }) => {
          const users = getUsers();
          const { userId, schoolId } = args.where.userId_schoolId;
          const user = users.find((item) => item.id === userId);
          const membership = user?.memberships.find(
            (item) => item.schoolId === schoolId,
          );

          if (!membership) {
            throw new Error('Membership not found');
          }

          membership.status = args.data.status;

          return pick(args.select, {
            userId,
            schoolId,
            status: membership.status,
            joinedAt: membership.joinedAt,
          });
        },
      ),
    },
    userRole: {
      findMany: jest.fn(
        async (args: {
          where: {
            userId?: string;
            schoolId?: string;
            role?: { name?: string; scope?: Scope };
            OR?: Array<{
              schoolId: string | null;
              role: { scope: Scope };
            }>;
            user?: unknown;
          };
          select?: Select;
        }) => {
          const users = getUsers();

          if (args.where.userId) {
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
                    clause.role.scope === role.role.scope,
                ),
              )
              .map((role) => ({
                role: {
                  name: role.role.name,
                  rolePermissions: role.role.permissionKeys.map((key) => ({
                    permission: { key },
                  })),
                },
              }));
          }

          if (args.where.schoolId && args.where.role?.name) {
            return users
              .filter(
                (user) =>
                  user.memberships.some(
                    (membership) =>
                      membership.schoolId === args.where.schoolId &&
                      membership.status === MembershipStatus.ACTIVE,
                  ) &&
                  user.userRoles.some(
                    (userRole) =>
                      userRole.schoolId === args.where.schoolId &&
                      userRole.role.name === args.where.role?.name,
                  ),
              )
              .map((user) => ({ userId: user.id }));
          }

          return [];
        },
      ),
      create: jest.fn(
        async (args: {
          data: { userId: string; roleId: string; schoolId: string };
          select?: Select;
        }) => {
          const users = getUsers();
          const user = users.find((item) => item.id === args.data.userId);
          const role = getRoles().find(
            (item) => item.id === args.data.roleId,
          ) as RoleFixture;

          const alreadyAssigned = user?.userRoles.some(
            (item) =>
              item.schoolId === args.data.schoolId &&
              item.role.id === args.data.roleId,
          );

          if (alreadyAssigned) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              { code: 'P2002', clientVersion: 'test' },
            );
          }

          user?.userRoles.push({ schoolId: args.data.schoolId, role });

          return {
            id: `ur-${args.data.userId}-${args.data.roleId}-${args.data.schoolId}`,
            userId: args.data.userId,
            roleId: args.data.roleId,
            schoolId: args.data.schoolId,
          };
        },
      ),
      delete: jest.fn(
        async (args: {
          where: {
            userId_roleId_schoolId: {
              userId: string;
              roleId: string;
              schoolId: string;
            };
          };
        }) => {
          const users = getUsers();
          const { userId, roleId, schoolId } =
            args.where.userId_roleId_schoolId;
          const user = users.find((item) => item.id === userId);
          const index =
            user?.userRoles.findIndex(
              (item) => item.schoolId === schoolId && item.role.id === roleId,
            ) ?? -1;

          if (!user || index === -1) {
            throw new Prisma.PrismaClientKnownRequestError('Record not found', {
              code: 'P2025',
              clientVersion: 'test',
            });
          }

          user.userRoles.splice(index, 1);

          return {};
        },
      ),
    },
    role: {
      findUnique: jest.fn(
        async (args: { where: { id: string }; select?: Select }) => {
          const role = getRoles().find((item) => item.id === args.where.id);

          if (!role) {
            return null;
          }

          return pick(args.select, {
            id: role.id,
            name: role.name,
            scope: role.scope,
          });
        },
      ),
      findMany: jest.fn(
        async (args: { where: { scope: Scope }; select?: Select }) => {
          return getRoles()
            .filter((role) => role.scope === args.where.scope)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((role) => ({
              id: role.id,
              name: role.name,
              description: null,
              scope: role.scope,
            }));
        },
      ),
    },
    school: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => null),
      update: jest.fn(async () => null),
    },
  };

  return prisma;
}

describe('Users, Membership and Role Administration (e2e)', () => {
  let app: INestApplication<App>;
  let users: UserFixture[];
  let schools: SchoolFixture[];
  let roles: RoleFixture[];
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
  const schoolC: SchoolFixture = {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Jinja College',
    code: 'JJC',
  };

  const schoolAdminRole: RoleFixture = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'SCHOOL_ADMIN',
    scope: RoleScope.SCHOOL,
    permissionKeys: [
      'users.read',
      'users.create',
      'users.update',
      'users.delete',
      'memberships.read',
      'memberships.create',
      'memberships.update',
      'memberships.delete',
      'roles.read',
      'roles.assign',
      'roles.revoke',
    ],
  };
  const teacherRole: RoleFixture = {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'TEACHER',
    scope: RoleScope.SCHOOL,
    permissionKeys: ['users.read', 'roles.read'],
  };
  const staffRole: RoleFixture = {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'STAFF',
    scope: RoleScope.SCHOOL,
    permissionKeys: ['roles.read'],
  };
  const studentRole: RoleFixture = {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'STUDENT',
    scope: RoleScope.SCHOOL,
    permissionKeys: [],
  };
  const superAdminRole: RoleFixture = {
    id: '00000000-0000-4000-8000-000000000005',
    name: 'SUPER_ADMIN',
    scope: RoleScope.SYSTEM,
    permissionKeys: [
      'users.read',
      'users.create',
      'users.update',
      'users.delete',
      'memberships.read',
      'memberships.create',
      'memberships.update',
      'memberships.delete',
      'roles.read',
      'roles.assign',
      'roles.revoke',
    ],
  };

  const password = 'SecurePass123!';

  function member(
    id: string,
    school: SchoolFixture,
    status: MembershipStatusValue,
    joinedAt: Date,
  ): MembershipFixture {
    return {
      id,
      schoolId: school.id,
      status,
      joinedAt,
      school,
    };
  }

  beforeAll(async () => {
    passwordHash = await new PasswordService().hash(password);
  });

  beforeEach(async () => {
    schools = [schoolA, schoolB, schoolC];
    roles = [
      schoolAdminRole,
      teacherRole,
      staffRole,
      studentRole,
      superAdminRole,
    ];

    const adminA: UserFixture = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      email: 'admin-a@school.example',
      fullName: 'Admin A',
      passwordHash,
      status: UserStatus.ACTIVE,
      memberships: [
        member(
          'm-admin-a',
          schoolA,
          MembershipStatus.ACTIVE,
          new Date('2024-01-01'),
        ),
      ],
      userRoles: [{ schoolId: schoolA.id, role: schoolAdminRole }],
    };
    const adminA2: UserFixture = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      email: 'admin-a2@school.example',
      fullName: 'Admin A 2',
      passwordHash,
      status: UserStatus.ACTIVE,
      memberships: [
        member(
          'm-admin-a2',
          schoolA,
          MembershipStatus.ACTIVE,
          new Date('2024-01-02'),
        ),
      ],
      userRoles: [{ schoolId: schoolA.id, role: schoolAdminRole }],
    };
    const teacherA: UserFixture = {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      email: 'teacher-a@school.example',
      fullName: 'Teacher A',
      passwordHash,
      status: UserStatus.ACTIVE,
      memberships: [
        member(
          'm-teacher-a',
          schoolA,
          MembershipStatus.ACTIVE,
          new Date('2024-01-03'),
        ),
      ],
      userRoles: [{ schoolId: schoolA.id, role: teacherRole }],
    };
    const studentA: UserFixture = {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      email: 'student-a@school.example',
      fullName: 'Student A',
      passwordHash,
      status: UserStatus.ACTIVE,
      memberships: [
        member(
          'm-student-a',
          schoolA,
          MembershipStatus.ACTIVE,
          new Date('2024-01-04'),
        ),
      ],
      userRoles: [{ schoolId: schoolA.id, role: studentRole }],
    };
    const memberB: UserFixture = {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      email: 'member-b@school.example',
      fullName: 'Admin B',
      passwordHash,
      status: UserStatus.ACTIVE,
      memberships: [
        member(
          'm-admin-b',
          schoolB,
          MembershipStatus.ACTIVE,
          new Date('2024-01-05'),
        ),
      ],
      userRoles: [{ schoolId: schoolB.id, role: schoolAdminRole }],
    };
    const adminC: UserFixture = {
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      email: 'admin-c@school.example',
      fullName: 'Admin C',
      passwordHash,
      status: UserStatus.ACTIVE,
      memberships: [
        member(
          'm-admin-c',
          schoolC,
          MembershipStatus.ACTIVE,
          new Date('2024-01-06'),
        ),
      ],
      userRoles: [{ schoolId: schoolC.id, role: schoolAdminRole }],
    };
    const standaloneUser: UserFixture = {
      id: '99999999-9999-4999-8999-999999999999',
      email: 'standalone@school.example',
      fullName: 'Standalone User',
      passwordHash,
      status: UserStatus.ACTIVE,
      memberships: [],
      userRoles: [],
    };
    const superUser: UserFixture = {
      id: '77777777-7777-4777-8777-777777777777',
      email: 'super@platform.example',
      fullName: 'Platform Super Admin',
      passwordHash,
      status: UserStatus.ACTIVE,
      memberships: [],
      userRoles: [{ schoolId: null, role: superAdminRole }],
    };

    users = [
      adminA,
      adminA2,
      teacherA,
      studentA,
      memberB,
      adminC,
      standaloneUser,
      superUser,
    ];

    const prismaMock = createPrismaMock(
      () => users,
      () => schools,
      () => roles,
    );

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

  describe('authentication', () => {
    it('rejects POST /users without a JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({ email: 'x@school.example', password, fullName: 'X' })
        .expect(401);
    });

    it('rejects GET /users without a JWT', async () => {
      await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('rejects GET /roles without a JWT', async () => {
      await request(app.getHttpServer()).get('/api/v1/roles').expect(401);
    });
  });

  describe('create user', () => {
    it('creates a user with a normalized email and never exposes the password hash', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'NEW-TEACHER@Example.com',
          password,
          fullName: 'New Teacher',
        })
        .expect(201);

      expect(response.body.email).toBe('new-teacher@example.com');
      expect(response.body.fullName).toBe('New Teacher');
      expect(response.body.status).toBe('ACTIVE');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('rejects a duplicate email', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'new-teacher@school.example',
          password,
          fullName: 'New A',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'new-teacher@school.example',
          password,
          fullName: 'New B',
        })
        .expect(409);
    });

    it('rejects an existing email', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'admin-a@school.example',
          password,
          fullName: 'Clone',
        })
        .expect(409);

      expect(response.body.message).toBe(
        'A user with this email already exists.',
      );
    });

    it('rejects an invalid email', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'not-an-email', password, fullName: 'A' })
        .expect(400);

      expect(response.body.message).toEqual(expect.any(Array));
    });

    it('rejects a short password', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'short@school.example',
          password: 'short',
          fullName: 'A',
        })
        .expect(400);

      expect(response.body.message).toEqual(expect.any(Array));
    });

    it('rejects a forbidden extra field', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'extra@school.example',
          password,
          fullName: 'A',
          schoolId: schoolB.id,
        })
        .expect(400);

      expect(response.body.message).toEqual(expect.any(Array));
    });
  });

  describe('list members', () => {
    it('returns only members of the active school, never other schools', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const userIds = response.body.map(
        (item: { userId: string }) => item.userId,
      );

      expect(userIds).toEqual(
        expect.arrayContaining([
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        ]),
      );
      expect(userIds).not.toContain('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
      expect(userIds).not.toContain('ffffffff-ffff-4fff-8fff-ffffffffffff');
      expect(userIds).not.toContain('77777777-7777-4777-8777-777777777777');
    });

    it('includes role names and never leaks the password hash', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const teacher = response.body.find(
        (item: { userId: string }) =>
          item.userId === 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      );

      expect(teacher.roleNames).toEqual(['TEACHER']);
      expect(teacher.membershipStatus).toBe('ACTIVE');
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });
  });

  describe('get member', () => {
    it('returns a member of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/cccccccc-cccc-4ccc-8ccc-cccccccccccc')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.userId).toBe('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
      expect(response.body.email).toBe('teacher-a@school.example');
      expect(response.body.roleNames).toEqual(['TEACHER']);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('reports a user from another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe(
        'User is not a member of this school.',
      );
    });

    it('reports an unknown user as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/users/99999999-9999-4999-8999-999999999999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('rejects a malformed user id', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/users/not-a-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('membership', () => {
    it('adds an existing user to the active school with an ACTIVE membership', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/99999999-9999-4999-8999-999999999999/membership')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(response.body.userId).toBe('99999999-9999-4999-8999-999999999999');
      expect(response.body.schoolId).toBe(schoolA.id);
      expect(response.body.status).toBe('ACTIVE');
    });

    it('ignores a client-supplied school id when creating a membership', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/99999999-9999-4999-8999-999999999999/membership')
        .set('Authorization', `Bearer ${token}`)
        .send({ schoolId: schoolB.id })
        .expect(201);

      expect(response.body.schoolId).toBe(schoolA.id);
      expect(response.body.schoolId).not.toBe(schoolB.id);
    });

    it('rejects a duplicate membership', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/users/99999999-9999-4999-8999-999999999999/membership')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/99999999-9999-4999-8999-999999999999/membership')
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'User is already a member of this school.',
      );
    });

    it('rejects adding an unknown user', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/users/44444444-4444-4444-8444-444444444444/membership')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('rejects updating a membership in another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/membership')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' })
        .expect(404);

      expect(response.body.message).toBe(
        'Membership not found in this school.',
      );
    });

    it('deactivates a membership when another active administrator remains', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/membership')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      expect(response.body.status).toBe('INACTIVE');
    });

    it('refuses to deactivate the last active school administrator', async () => {
      const token = await loginAs('admin-c@school.example');

      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/ffffffff-ffff-4fff-8fff-ffffffffffff/membership')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' })
        .expect(403);

      expect(response.body.message).toBe(
        'This action would leave the school without an active administrator.',
      );
    });

    it('invalidates the deactivated member token on the next request', async () => {
      const adminToken = await loginAs('admin-a@school.example');
      const adminA2Token = await loginAs('admin-a2@school.example');

      await request(app.getHttpServer())
        .patch('/api/v1/users/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/membership')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminA2Token}`)
        .expect(401);

      expect(response.body.message).toBe('Invalid school context.');
    });

    it('reactivates an inactive membership', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .patch('/api/v1/users/cccccccc-cccc-4ccc-8ccc-cccccccccccc/membership')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/cccccccc-cccc-4ccc-8ccc-cccccccccccc/membership')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
    });
  });

  describe('roles', () => {
    it('lists only assignable SCHOOL roles, never SYSTEM roles', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const names = response.body.map((item: { name: string }) => item.name);

      expect(names).toEqual(
        expect.arrayContaining(['SCHOOL_ADMIN', 'TEACHER', 'STAFF', 'STUDENT']),
      );
      expect(names).not.toContain('SUPER_ADMIN');
      expect(response.body).not.toHaveProperty('scope', 'SYSTEM');
    });

    it('assigns a SCHOOL role to a member of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/dddddddd-dddd-4ddd-8ddd-dddddddddddd/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ roleId: teacherRole.id })
        .expect(201);

      expect(response.body.userId).toBe('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
      expect(response.body.roleId).toBe(teacherRole.id);
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects a duplicate role assignment', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/users/dddddddd-dddd-4ddd-8ddd-dddddddddddd/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ roleId: teacherRole.id })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/dddddddd-dddd-4ddd-8ddd-dddddddddddd/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ roleId: teacherRole.id })
        .expect(409);

      expect(response.body.message).toBe(
        'This role is already assigned to the user in this school.',
      );
    });

    it('refuses to assign a SYSTEM role through school administration', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/dddddddd-dddd-4ddd-8ddd-dddddddddddd/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ roleId: superAdminRole.id })
        .expect(403);

      expect(response.body.message).toBe(
        'System roles cannot be assigned through school administration.',
      );
    });

    it('rejects assigning a role to a user outside the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ roleId: teacherRole.id })
        .expect(404);

      expect(response.body.message).toBe(
        'User is not a member of this school.',
      );
    });

    it('rejects assigning a role to an inactive membership', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .patch('/api/v1/users/dddddddd-dddd-4ddd-8ddd-dddddddddddd/membership')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/dddddddd-dddd-4ddd-8ddd-dddddddddddd/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ roleId: teacherRole.id })
        .expect(403);

      expect(response.body.message).toBe(
        'Cannot assign roles to an inactive membership.',
      );
    });

    it('rejects assigning an unknown role', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/users/dddddddd-dddd-4ddd-8ddd-dddddddddddd/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ roleId: '44444444-4444-4444-8444-444444444444' })
        .expect(404);
    });

    it('revokes a SCHOOL role from a member of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(
          '/api/v1/users/cccccccc-cccc-4ccc-8ccc-cccccccccccc/roles/' +
            teacherRole.id,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('rejects revoking a role that is not assigned', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(
          '/api/v1/users/cccccccc-cccc-4ccc-8ccc-cccccccccccc/roles/' +
            teacherRole.id,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const second = await request(app.getHttpServer())
        .delete(
          '/api/v1/users/cccccccc-cccc-4ccc-8ccc-cccccccccccc/roles/' +
            teacherRole.id,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(second.body.message).toBe(
        'Role assignment not found in this school.',
      );
      expect(response.status).toBe(200);
    });

    it('refuses to revoke a SYSTEM role through school administration', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(
          '/api/v1/users/dddddddd-dddd-4ddd-8ddd-dddddddddddd/roles/' +
            superAdminRole.id,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'System roles cannot be revoked through school administration.',
      );
    });

    it('rejects revoking a role from a user outside the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(
          '/api/v1/users/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/roles/' +
            teacherRole.id,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe(
        'User is not a member of this school.',
      );
    });

    it('refuses to revoke the last active administrator SCHOOL_ADMIN role', async () => {
      const token = await loginAs('admin-c@school.example');

      const response = await request(app.getHttpServer())
        .delete(
          '/api/v1/users/ffffffff-ffff-4fff-8fff-ffffffffffff/roles/' +
            schoolAdminRole.id,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'This action would leave the school without an active administrator.',
      );
    });

    it('allows revoking SCHOOL_ADMIN when another active administrator remains', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(
          '/api/v1/users/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/roles/' +
            schoolAdminRole.id,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('rejects a malformed role id on assign', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/users/dddddddd-dddd-4ddd-8ddd-dddddddddddd/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ roleId: 'not-a-uuid' })
        .expect(400);
    });

    it('rejects a malformed role id on revoke', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(
          '/api/v1/users/dddddddd-dddd-4ddd-8ddd-dddddddddddd/roles/not-a-uuid',
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('authorization', () => {
    it('rejects GET /users without the users.read permission', async () => {
      const token = await loginAs('student-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have permission to perform this action.',
      );
    });

    it('allows GET /users with the users.read permission from a SCHOOL role', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejects POST /users without the users.create permission', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'x@school.example', password, fullName: 'X' })
        .expect(403);
    });

    it('rejects GET /roles without the roles.read permission', async () => {
      const token = await loginAs('student-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects role assignment without the roles.assign permission', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/users/dddddddd-dddd-4ddd-8ddd-dddddddddddd/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ roleId: teacherRole.id })
        .expect(403);
    });
  });

  describe('no active school context', () => {
    it('allows a SYSTEM user with users.create to create a user', async () => {
      const token = await loginAs('super@platform.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'system@school.example', password, fullName: 'System' })
        .expect(201);

      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('rejects school-scoped operations without an active school context', async () => {
      const token = await loginAs('super@platform.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'Active school context is required for this operation.',
      );
    });
  });

  describe('tenant isolation', () => {
    it('ignores a client-supplied school id in the query string for GET /users', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .query({ schoolId: schoolB.id })
        .expect(200);

      const userIds = response.body.map(
        (item: { userId: string }) => item.userId,
      );

      expect(userIds).not.toContain('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
      expect(userIds).toContain('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    });

    it('assigns roles only within the active school scope', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/dddddddd-dddd-4ddd-8ddd-dddddddddddd/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ roleId: teacherRole.id })
        .expect(201);

      expect(response.body.schoolId).toBe(schoolA.id);
      expect(response.body.schoolId).not.toBe(schoolB.id);
    });
  });
});
