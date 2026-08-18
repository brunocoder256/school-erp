import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import {
  MembershipStatus,
  RoleScope,
  UserStatus,
} from '../../generated/prisma/enums';

export type Scope = (typeof RoleScope)[keyof typeof RoleScope];
export type MembershipStatusValue =
  (typeof MembershipStatus)[keyof typeof MembershipStatus];
export type UserStatusValue = (typeof UserStatus)[keyof typeof UserStatus];

export type SchoolFixture = {
  id: string;
  name: string;
  code: string;
};

export type UserRoleFixture = {
  schoolId: string | null;
  roleName: string;
  roleScope: Scope;
  permissionKeys: string[];
};

export type MembershipFixture = {
  schoolId: string;
  status: MembershipStatusValue;
  joinedAt: Date;
  school: SchoolFixture;
};

export type UserFixture = {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  status: UserStatusValue;
  memberships: MembershipFixture[];
  userRoles: UserRoleFixture[];
};

type Select = Record<string, true>;
type RecordData = Record<string, unknown>;

function pick(select: Select | undefined, source: RecordData) {
  const out: RecordData = {};
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

function notFound(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: 'test',
  });
}

/**
 * Identity / auth models shared by every E2E spec. Mirrors the mock used in
 * the academic-years E2E spec so JWT login, school selection and the
 * permission guard behave identically.
 */
export function createIdentityMocks(getUsers: () => UserFixture[]) {
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
  };

  return prisma;
}

type Collections = Record<string, RecordData[]>;

/**
 * Maps "model.relation" -> { collection, foreignKey } so `_count` selects
 * can be computed from in-memory data (e.g. educationSection.levels counts
 * academicLevel rows whose sectionId matches the section).
 */
export type RelationMap = Record<
  string,
  { collection: string; foreignKey: string }
>;

function matchesWhere(where: RecordData | undefined, record: RecordData) {
  if (!where) {
    return true;
  }

  for (const [key, value] of Object.entries(where)) {
    if (value && typeof value === 'object' && 'in' in value) {
      if (!Array.isArray(value.in) || !value.in.includes(record[key])) {
        return false;
      }
    } else if (record[key] !== value) {
      return false;
    }
  }

  return true;
}

/**
 * Generic in-memory Prisma store covering the CRUD shape used by the
 * academic-structure and subjects services: findFirst, findMany, create,
 * update, delete, deleteMany, createMany with scalar selects, `_count`
 * selects and single-key ordering.
 */
export function createInMemoryStore(
  getCollections: () => Collections,
  relations: RelationMap,
) {
  const store: Record<string, Record<string, jest.Mock>> = {};
  const data: Record<string, RecordData[]> = {};

  for (const model of Object.keys(getCollections())) {
    data[model] = getCollections()[model].map((item) => ({ ...item }));
  }

  for (const model of Object.keys(data)) {
    store[model] = {
      findFirst: jest.fn(
        async (args: { where?: RecordData; select?: Select }) => {
          const collections = data;
          const record =
            collections[model].find((item) =>
              matchesWhere(args.where, item),
            ) ?? null;

          if (!record) {
            return null;
          }

          return pickWithCount(model, args.select, record);
        },
      ),
      findMany: jest.fn(
        async (args: {
          where?: RecordData;
          select?: Select;
          orderBy?: Record<string, 'asc' | 'desc'>;
        }) => {
          const collections = data;
          let rows = collections[model].filter((item) =>
            matchesWhere(args.where, item),
          );

          if (args.orderBy) {
            const [key, direction] = Object.entries(args.orderBy)[0];
            rows = [...rows].sort((a, b) => {
              const left = a[key] as number;
              const right = b[key] as number;
              const result = left < right ? -1 : left > right ? 1 : 0;
              return direction === 'desc' ? -result : result;
            });
          }

          return rows.map((item) => pickWithCount(model, args.select, item));
        },
      ),
      create: jest.fn(
        async (args: { data: RecordData; select?: Select }) => {
          const collections = data;
          const record: RecordData = {
            id: randomUUID(),
            ...args.data,
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
          };

          collections[model].push(record);

          return pickWithCount(model, args.select, record);
        },
      ),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: RecordData;
          select?: Select;
        }) => {
          const collections = data;
          const record = collections[model].find(
            (item) => item.id === args.where.id,
          );

          if (!record) {
            throw notFound();
          }

          const merged = { ...record, ...args.data, updatedAt: record.updatedAt };
          Object.assign(record, merged);

          return pickWithCount(model, args.select, record);
        },
      ),
      delete: jest.fn(async (args: { where: { id: string } }) => {
        const collections = data;
        const index = collections[model].findIndex(
          (item) => item.id === args.where.id,
        );

        if (index === -1) {
          throw notFound();
        }

        collections[model].splice(index, 1);

        return {};
      }),
      deleteMany: jest.fn(async (args: { where: RecordData }) => {
        const collections = data;
        const before = collections[model].length;
        collections[model] = collections[model].filter(
          (item) => !matchesWhere(args.where, item),
        );

        return { count: before - collections[model].length };
      }),
      createMany: jest.fn(async (args: { data: RecordData[] }) => {
        const collections = data;
        collections[model].push(...args.data.map((item) => ({ ...item })));

        return { count: args.data.length };
      }),
    };
  }

  function pickWithCount(
    model: string,
    select: Select | undefined,
    record: RecordData,
  ) {
    const out: RecordData = {};

    if (!select) {
      return out;
    }

    for (const key of Object.keys(select)) {
      if (key === '_count' && select[key]) {
        const countSelect = select[key] as { select: Record<string, true> };
        const counts: Record<string, number> = {};

        for (const relation of Object.keys(countSelect.select)) {
          const mapping = relations[`${model}.${relation}`];

          if (!mapping) {
            counts[relation] = 0;
            continue;
          }

          counts[relation] = data[mapping.collection].filter(
            (item) => item[mapping.foreignKey] === record.id,
          ).length;
        }

        out['_count'] = counts;
        continue;
      }

      if (key in record) {
        out[key] = record[key];
      }
    }

    return out;
  }

  return store;
}
