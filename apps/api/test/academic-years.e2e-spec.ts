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

type AcademicYearFixture = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};

type TermFixture = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  academicYearId: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserRoleFixture = {
  schoolId: string | null;
  roleName: string;
  roleScope: Scope;
  permissionKeys: string[];
};

type MembershipFixture = {
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
  getAcademicYears: () => AcademicYearFixture[],
  getTerms: () => TermFixture[],
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
    },
    schoolMembership: {
      findUnique: jest.fn(
        async (args: {
          where: { userId_schoolId: { userId: string; schoolId: string } };
          select?: Select;
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

          return pick(args.select, {
            id: membership.schoolId,
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
            userId: string;
            OR?: Array<{
              schoolId: string | null;
              role: { scope: Scope };
            }>;
          };
          select?: Select;
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
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => null),
      update: jest.fn(async () => null),
    },
    academicYear: {
      findFirst: jest.fn(
        async (args: {
          where: {
            id?: string;
            schoolId?: string;
            name?: string;
          };
          select?: Select;
        }) => {
          const years = getAcademicYears();
          const year =
            years.find(
              (item) =>
                (args.where.id ? item.id === args.where.id : true) &&
                (args.where.schoolId
                  ? item.schoolId === args.where.schoolId
                  : true) &&
                (args.where.name ? item.name === args.where.name : true),
            ) ?? null;

          if (!year) {
            return null;
          }

          return pick(args.select, {
            id: year.id,
            name: year.name,
            startDate: year.startDate,
            endDate: year.endDate,
            isActive: year.isActive,
            schoolId: year.schoolId,
            createdAt: year.createdAt,
            updatedAt: year.updatedAt,
            _count: {
              terms: getTerms().filter((t) => t.academicYearId === year.id)
                .length,
            },
          });
        },
      ),
      findMany: jest.fn(
        async (args: {
          where: { schoolId: string };
          select?: Select;
          orderBy?: unknown;
        }) => {
          return getAcademicYears()
            .filter((item) => item.schoolId === args.where.schoolId)
            .map((item) =>
              pick(args.select, {
                id: item.id,
                name: item.name,
                startDate: item.startDate,
                endDate: item.endDate,
                isActive: item.isActive,
                schoolId: item.schoolId,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              }),
            );
        },
      ),
      create: jest.fn(
        async (args: {
          data: {
            schoolId: string;
            name: string;
            startDate: string;
            endDate: string;
            isActive: boolean;
          };
          select?: Select;
        }) => {
          const years = getAcademicYears();
          const duplicate = years.some(
            (item) =>
              item.schoolId === args.data.schoolId &&
              item.name === args.data.name,
          );

          if (duplicate) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              { code: 'P2002', clientVersion: 'test' },
            );
          }

          const year: AcademicYearFixture = {
            id: '70000000-0000-4000-8000-000000000000',
            name: args.data.name,
            startDate: new Date(args.data.startDate),
            endDate: new Date(args.data.endDate),
            isActive: args.data.isActive,
            schoolId: args.data.schoolId,
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
          };

          years.push(year);

          return pick(args.select, {
            id: year.id,
            name: year.name,
            startDate: year.startDate,
            endDate: year.endDate,
            isActive: year.isActive,
            schoolId: year.schoolId,
            createdAt: year.createdAt,
            updatedAt: year.updatedAt,
          });
        },
      ),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: Partial<AcademicYearFixture>;
          select?: Select;
        }) => {
          const years = getAcademicYears();
          const year = years.find((item) => item.id === args.where.id);

          if (!year) {
            throw new Prisma.PrismaClientKnownRequestError('Record not found', {
              code: 'P2025',
              clientVersion: 'test',
            });
          }

          const name = args.data.name ?? year.name;
          const duplicate = years.some(
            (item) =>
              item.id !== year.id &&
              item.schoolId === year.schoolId &&
              item.name === name,
          );

          if (duplicate) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              { code: 'P2002', clientVersion: 'test' },
            );
          }

          const merged = { ...year, ...args.data, name };
          Object.assign(year, merged);

          return pick(args.select, {
            id: merged.id,
            name: merged.name,
            startDate: merged.startDate,
            endDate: merged.endDate,
            isActive: merged.isActive,
            schoolId: merged.schoolId,
            createdAt: merged.createdAt,
            updatedAt: merged.updatedAt,
          });
        },
      ),
      delete: jest.fn(async (args: { where: { id: string } }) => {
        const years = getAcademicYears();
        const index = years.findIndex((item) => item.id === args.where.id);

        if (index === -1) {
          throw new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: 'test',
          });
        }

        years.splice(index, 1);

        return {};
      }),
    },
    term: {
      findFirst: jest.fn(
        async (args: {
          where: {
            id?: string;
            academicYearId?: string;
            name?: string;
          };
          select?: Select;
        }) => {
          const terms = getTerms();
          const term =
            terms.find(
              (item) =>
                (args.where.id ? item.id === args.where.id : true) &&
                (args.where.academicYearId
                  ? item.academicYearId === args.where.academicYearId
                  : true) &&
                (args.where.name ? item.name === args.where.name : true),
            ) ?? null;

          if (!term) {
            return null;
          }

          return pick(args.select, {
            id: term.id,
            name: term.name,
            startDate: term.startDate,
            endDate: term.endDate,
            isActive: term.isActive,
            academicYearId: term.academicYearId,
            createdAt: term.createdAt,
            updatedAt: term.updatedAt,
          });
        },
      ),
      findMany: jest.fn(
        async (args: {
          where: { academicYearId: string };
          select?: Select;
          orderBy?: unknown;
        }) => {
          return getTerms()
            .filter((item) => item.academicYearId === args.where.academicYearId)
            .map((item) =>
              pick(args.select, {
                id: item.id,
                name: item.name,
                startDate: item.startDate,
                endDate: item.endDate,
                isActive: item.isActive,
                academicYearId: item.academicYearId,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              }),
            );
        },
      ),
      create: jest.fn(
        async (args: {
          data: {
            academicYearId: string;
            name: string;
            startDate: string;
            endDate: string;
            isActive: boolean;
          };
          select?: Select;
        }) => {
          const terms = getTerms();
          const duplicate = terms.some(
            (item) =>
              item.academicYearId === args.data.academicYearId &&
              item.name === args.data.name,
          );

          if (duplicate) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              { code: 'P2002', clientVersion: 'test' },
            );
          }

          const term: TermFixture = {
            id: '80000000-0000-4000-8000-000000000000',
            name: args.data.name,
            startDate: new Date(args.data.startDate),
            endDate: new Date(args.data.endDate),
            isActive: args.data.isActive,
            academicYearId: args.data.academicYearId,
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
          };

          terms.push(term);

          return pick(args.select, {
            id: term.id,
            name: term.name,
            startDate: term.startDate,
            endDate: term.endDate,
            isActive: term.isActive,
            academicYearId: term.academicYearId,
            createdAt: term.createdAt,
            updatedAt: term.updatedAt,
          });
        },
      ),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: Partial<TermFixture>;
          select?: Select;
        }) => {
          const terms = getTerms();
          const term = terms.find((item) => item.id === args.where.id);

          if (!term) {
            throw new Prisma.PrismaClientKnownRequestError('Record not found', {
              code: 'P2025',
              clientVersion: 'test',
            });
          }

          const name = args.data.name ?? term.name;
          const duplicate = terms.some(
            (item) =>
              item.id !== term.id &&
              item.academicYearId === term.academicYearId &&
              item.name === name,
          );

          if (duplicate) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              { code: 'P2002', clientVersion: 'test' },
            );
          }

          const merged = { ...term, ...args.data, name };
          Object.assign(term, merged);

          return pick(args.select, {
            id: merged.id,
            name: merged.name,
            startDate: merged.startDate,
            endDate: merged.endDate,
            isActive: merged.isActive,
            academicYearId: merged.academicYearId,
            createdAt: merged.createdAt,
            updatedAt: merged.updatedAt,
          });
        },
      ),
      delete: jest.fn(async (args: { where: { id: string } }) => {
        const terms = getTerms();
        const index = terms.findIndex((item) => item.id === args.where.id);

        if (index === -1) {
          throw new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: 'test',
          });
        }

        terms.splice(index, 1);

        return {};
      }),
    },
  };

  return prisma;
}

describe('Academic Years and Terms (e2e)', () => {
  let app: INestApplication<App>;
  let users: UserFixture[];
  let schools: SchoolFixture[];
  let academicYears: AcademicYearFixture[];
  let terms: TermFixture[];
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

  const ayA1: AcademicYearFixture = {
    id: '10000000-0000-4000-8000-000000000001',
    name: '2026',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    isActive: false,
    schoolId: schoolA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const ayA2: AcademicYearFixture = {
    id: '10000000-0000-4000-8000-000000000002',
    name: '2025',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    isActive: false,
    schoolId: schoolA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const ayB1: AcademicYearFixture = {
    id: '10000000-0000-4000-8000-000000000003',
    name: '2026',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    isActive: false,
    schoolId: schoolB.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const termA1: TermFixture = {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Term 1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-03-31'),
    isActive: false,
    academicYearId: ayA1.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const termA2: TermFixture = {
    id: '20000000-0000-4000-8000-000000000002',
    name: 'Term 2',
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-06-30'),
    isActive: false,
    academicYearId: ayA1.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const termB1: TermFixture = {
    id: '20000000-0000-4000-8000-000000000003',
    name: 'Term 1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-03-31'),
    isActive: false,
    academicYearId: ayB1.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const password = 'SecurePass123!';

  const schoolAdminKeys = [
    'academic_years.read',
    'academic_years.create',
    'academic_years.update',
    'academic_years.delete',
    'terms.read',
    'terms.create',
    'terms.update',
    'terms.delete',
  ];

  function member(
    school: SchoolFixture,
    status: MembershipStatusValue,
    joinedAt: Date,
  ): MembershipFixture {
    return {
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
    schools = [schoolA, schoolB];
    academicYears = [{ ...ayA1 }, { ...ayA2 }, { ...ayB1 }];
    terms = [{ ...termA1 }, { ...termA2 }, { ...termB1 }];

    users = [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        email: 'admin-a@school.example',
        fullName: 'Admin A',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          member(schoolA, MembershipStatus.ACTIVE, new Date('2024-01-01')),
        ],
        userRoles: [
          {
            schoolId: schoolA.id,
            roleName: 'SCHOOL_ADMIN',
            roleScope: RoleScope.SCHOOL,
            permissionKeys: schoolAdminKeys,
          },
        ],
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        email: 'admin-ab@school.example',
        fullName: 'Admin A and B',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          member(schoolA, MembershipStatus.ACTIVE, new Date('2024-01-01')),
          member(schoolB, MembershipStatus.ACTIVE, new Date('2024-02-01')),
        ],
        userRoles: [
          {
            schoolId: schoolA.id,
            roleName: 'SCHOOL_ADMIN',
            roleScope: RoleScope.SCHOOL,
            permissionKeys: schoolAdminKeys,
          },
          {
            schoolId: schoolB.id,
            roleName: 'SCHOOL_ADMIN',
            roleScope: RoleScope.SCHOOL,
            permissionKeys: schoolAdminKeys,
          },
        ],
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        email: 'teacher-a@school.example',
        fullName: 'Teacher A',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          member(schoolA, MembershipStatus.ACTIVE, new Date('2024-01-01')),
        ],
        userRoles: [
          {
            schoolId: schoolA.id,
            roleName: 'TEACHER',
            roleScope: RoleScope.SCHOOL,
            permissionKeys: ['academic_years.read', 'terms.read'],
          },
        ],
      },
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        email: 'no-perms@school.example',
        fullName: 'No Permissions User',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          member(schoolA, MembershipStatus.ACTIVE, new Date('2024-01-01')),
        ],
        userRoles: [
          {
            schoolId: schoolA.id,
            roleName: 'STUDENT',
            roleScope: RoleScope.SCHOOL,
            permissionKeys: [],
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
            roleName: 'SUPER_ADMIN',
            roleScope: RoleScope.SYSTEM,
            permissionKeys: schoolAdminKeys,
          },
        ],
      },
    ];

    const prismaMock = createPrismaMock(
      () => users,
      () => schools,
      () => academicYears,
      () => terms,
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

  async function selectSchool(token: string, schoolId: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/select-school')
      .set('Authorization', `Bearer ${token}`)
      .send({ schoolId })
      .expect(201);

    return response.body.accessToken as string;
  }

  describe('authentication', () => {
    it('rejects GET /academic-years without a JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/academic-years')
        .expect(401);
    });

    it('rejects POST /academic-years without a JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/academic-years')
        .send({ name: '2027', startDate: '2027-01-01', endDate: '2027-12-31' })
        .expect(401);
    });

    it('rejects GET terms without a JWT', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/academic-years/${ayA1.id}/terms`)
        .expect(401);
    });
  });

  describe('authorization', () => {
    it('allows GET /academic-years with academic_years.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejects GET /academic-years without academic_years.read', async () => {
      const token = await loginAs('no-perms@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have permission to perform this action.',
      );
    });

    it('rejects POST /academic-years without academic_years.create', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '2027', startDate: '2027-01-01', endDate: '2027-12-31' })
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have permission to perform this action.',
      );
    });

    it('rejects PATCH /academic-years/:id without academic_years.update', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/academic-years/${ayA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('rejects DELETE /academic-years/:id without academic_years.delete', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/academic-years/${ayA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('allows GET terms with terms.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/academic-years/${ayA1.id}/terms`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejects GET terms without terms.read', async () => {
      const token = await loginAs('no-perms@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/academic-years/${ayA1.id}/terms`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects POST terms without terms.create', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .post(`/api/v1/academic-years/${ayA1.id}/terms`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Term 3',
          startDate: '2026-07-01',
          endDate: '2026-09-30',
        })
        .expect(403);
    });

    it('rejects PATCH terms without terms.update', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/academic-years/${ayA1.id}/terms/${termA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('rejects DELETE terms without terms.delete', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/academic-years/${ayA1.id}/terms/${termA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('no active school context', () => {
    it('rejects school-scoped operations without an active school context', async () => {
      const token = await loginAs('super@platform.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'Active school context is required for this operation.',
      );
    });
  });

  describe('academic year CRUD', () => {
    it('creates an academic year scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '2027', startDate: '2027-01-01', endDate: '2027-12-31' })
        .expect(201);

      expect(response.body.name).toBe('2027');
      expect(response.body.schoolId).toBe(schoolA.id);
      expect(response.body.schoolId).not.toBe(schoolB.id);
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('terms');
    });

    it('rejects a duplicate academic year name within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '2026', startDate: '2026-01-01', endDate: '2026-12-31' })
        .expect(409);

      expect(response.body.message).toBe(
        'An academic year with this name already exists in this school.',
      );
    });

    it('rejects an end date before the start date', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad', startDate: '2026-12-31', endDate: '2026-01-01' })
        .expect(400);
    });

    it('rejects an invalid date', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad', startDate: 'not-a-date', endDate: '2026-12-31' })
        .expect(400);

      expect(response.body.message).toEqual(expect.any(Array));
    });

    it('rejects a client-supplied school id (forbidden field)', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '2027',
          startDate: '2027-01-01',
          endDate: '2027-12-31',
          schoolId: schoolB.id,
        })
        .expect(400);

      expect(response.body.message).toEqual(expect.any(Array));
    });

    it('lists only academic years of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([ayA1.id, ayA2.id]));
      expect(ids).not.toContain(ayB1.id);
    });

    it('gets an academic year of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/academic-years/${ayA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(ayA1.id);
      expect(response.body.name).toBe('2026');
    });

    it('reports an academic year of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/academic-years/${ayB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Academic year not found.');
    });

    it('rejects a malformed academic year id', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/academic-years/not-a-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('updates an academic year of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/academic-years/${ayA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Academic Year 2026', isActive: true })
        .expect(200);

      expect(response.body.name).toBe('Academic Year 2026');
      expect(response.body.isActive).toBe(true);
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects renaming to a duplicate within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/academic-years/${ayA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '2026' })
        .expect(409);

      expect(response.body.message).toBe(
        'An academic year with this name already exists in this school.',
      );
    });

    it('reports updating an academic year of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/academic-years/${ayB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' })
        .expect(404);
    });

    it('refuses to delete an academic year that still has terms', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/academic-years/${ayA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete an academic year that still has terms. Delete or move its terms first.',
      );
    });

    it('deletes an academic year with no terms', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/academic-years/${ayA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const list = await request(app.getHttpServer())
        .get('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = list.body.map((item: { id: string }) => item.id);
      expect(ids).not.toContain(ayA2.id);
    });

    it('reports deleting an academic year of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/academic-years/${ayB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('term CRUD', () => {
    it('creates a term within the verified academic year', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/academic-years/${ayA1.id}/terms`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Term 3',
          startDate: '2026-07-01',
          endDate: '2026-09-30',
        })
        .expect(201);

      expect(response.body.name).toBe('Term 3');
      expect(response.body.academicYearId).toBe(ayA1.id);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('rejects a duplicate term name within the academic year', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/academic-years/${ayA1.id}/terms`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Term 1',
          startDate: '2026-01-01',
          endDate: '2026-03-31',
        })
        .expect(409);

      expect(response.body.message).toBe(
        'A term with this name already exists in this academic year.',
      );
    });

    it('rejects creating a term under an academic year of another school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/academic-years/${ayB1.id}/terms`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Term 1',
          startDate: '2026-01-01',
          endDate: '2026-03-31',
        })
        .expect(404);

      expect(response.body.message).toBe('Academic year not found.');
    });

    it('rejects creating a term under a nonexistent academic year', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post(
          '/api/v1/academic-years/99999999-9999-4999-8999-999999999999/terms',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Term 1',
          startDate: '2026-01-01',
          endDate: '2026-03-31',
        })
        .expect(404);
    });

    it('rejects a client-supplied school id when creating a term', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/academic-years/${ayA1.id}/terms`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Term 3',
          startDate: '2026-07-01',
          endDate: '2026-09-30',
          schoolId: schoolB.id,
        })
        .expect(400);

      expect(response.body.message).toEqual(expect.any(Array));
    });

    it('rejects an end date before the start date for a term', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post(`/api/v1/academic-years/${ayA1.id}/terms`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad', startDate: '2026-03-31', endDate: '2026-01-01' })
        .expect(400);
    });

    it('lists only terms of the requested academic year', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/academic-years/${ayA1.id}/terms`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([termA1.id, termA2.id]));
      expect(ids).not.toContain(termB1.id);
    });

    it('rejects listing terms of an academic year in another school', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/academic-years/${ayB1.id}/terms`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('gets a term within the verified academic year', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/academic-years/${ayA1.id}/terms/${termA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(termA1.id);
      expect(response.body.academicYearId).toBe(ayA1.id);
    });

    it('reports a term of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/academic-years/${ayA1.id}/terms/${termB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('updates a term within the verified academic year', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/academic-years/${ayA1.id}/terms/${termA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'First Term', isActive: true })
        .expect(200);

      expect(response.body.name).toBe('First Term');
      expect(response.body.isActive).toBe(true);
      expect(response.body.academicYearId).toBe(ayA1.id);
    });

    it('rejects renaming a term to a duplicate within the academic year', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/academic-years/${ayA1.id}/terms/${termA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Term 2' })
        .expect(409);

      expect(response.body.message).toBe(
        'A term with this name already exists in this academic year.',
      );
    });

    it('reports updating a term of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/academic-years/${ayA1.id}/terms/${termB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' })
        .expect(404);
    });

    it('deletes a term within the verified academic year', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/academic-years/${ayA1.id}/terms/${termA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const list = await request(app.getHttpServer())
        .get(`/api/v1/academic-years/${ayA1.id}/terms`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = list.body.map((item: { id: string }) => item.id);
      expect(ids).not.toContain(termA2.id);
    });

    it('reports deleting a term of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/academic-years/${ayA1.id}/terms/${termB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('tenant isolation', () => {
    it('never leaks an academic year or term of the inactive school', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const tokenA = await selectSchool(loginToken, schoolA.id);

      const yearsA = await request(app.getHttpServer())
        .get('/api/v1/academic-years')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const yearIds = yearsA.body.map((item: { id: string }) => item.id);
      expect(yearIds).toContain(ayA1.id);
      expect(yearIds).not.toContain(ayB1.id);

      const termsA = await request(app.getHttpServer())
        .get(`/api/v1/academic-years/${ayA1.id}/terms`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const termIds = termsA.body.map((item: { id: string }) => item.id);
      expect(termIds).toContain(termA1.id);
      expect(termIds).not.toContain(termB1.id);

      const tokenB = await selectSchool(loginToken, schoolB.id);

      const yearsB = await request(app.getHttpServer())
        .get('/api/v1/academic-years')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const yearIdsB = yearsB.body.map((item: { id: string }) => item.id);
      expect(yearIdsB).toContain(ayB1.id);
      expect(yearIdsB).not.toContain(ayA1.id);
    });

    it('ignores a client-supplied school id in the query string', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .query({ schoolId: schoolB.id })
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);
      expect(ids).not.toContain(ayB1.id);
      expect(ids).toContain(ayA1.id);
    });

    it('never returns passwordHash in any academic year or term response', async () => {
      const token = await loginAs('admin-a@school.example');

      const years = await request(app.getHttpServer())
        .get('/api/v1/academic-years')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(JSON.stringify(years.body)).not.toContain('passwordHash');

      const termsRes = await request(app.getHttpServer())
        .get(`/api/v1/academic-years/${ayA1.id}/terms`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(JSON.stringify(termsRes.body)).not.toContain('passwordHash');
    });
  });
});
