import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Prisma } from '../generated/prisma/client';
import { MembershipStatus, RoleScope, UserStatus } from '../generated/prisma/enums';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/modules/identity/services/password.service';
import {
  createIdentityMocks,
  createInMemoryStore,
  RelationMap,
  SchoolFixture,
  UserFixture,
} from './helpers/in-memory-prisma';

const password = 'SecurePass123!';

const schoolAdminKeys = [
  'academic_structure.read',
  'academic_structure.create',
  'academic_structure.update',
  'academic_structure.delete',
];

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('prisma error', {
    code,
    clientVersion: 'test',
  });
}

function row(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('Academic Structure (e2e)', () => {
  let app: INestApplication<App>;
  let users: UserFixture[];
  let passwordHash: string;

  const schoolA: SchoolFixture = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Mukono High School',
    code: 'MUK-H',
  };
  const schoolB: SchoolFixture = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Entebbe Secondary',
    code: 'EBB-S',
  };

  const sectionA1 = row('30000000-0000-4000-8000-000000000001', {
    name: 'Lower Secondary',
    code: 'LOWER_SECONDARY',
    description: null,
    displayOrder: 3,
    isActive: true,
    schoolId: schoolA.id,
  });
  const sectionA2 = row('30000000-0000-4000-8000-000000000002', {
    name: 'Primary',
    code: 'PRIMARY',
    description: null,
    displayOrder: 2,
    isActive: true,
    schoolId: schoolA.id,
  });
  const sectionA3 = row('30000000-0000-4000-8000-000000000003', {
    name: 'Upper Secondary',
    code: 'UPPER_SECONDARY',
    description: null,
    displayOrder: 4,
    isActive: true,
    schoolId: schoolA.id,
  });
  const sectionB1 = row('30000000-0000-4000-8000-000000000004', {
    name: 'Primary',
    code: 'PRIMARY',
    description: null,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolB.id,
  });

  const orgA1 = row('31000000-0000-4000-8000-000000000001', {
    name: 'Competency-based',
    code: 'COMPETENCY_BASED',
    description: null,
    isActive: true,
    schoolId: schoolA.id,
  });
  const orgA2 = row('31000000-0000-4000-8000-000000000002', {
    name: 'Thematic',
    code: 'THEMATIC',
    description: null,
    isActive: true,
    schoolId: schoolA.id,
  });
  const orgA3 = row('31000000-0000-4000-8000-000000000003', {
    name: 'Mixed',
    code: 'MIXED',
    description: null,
    isActive: true,
    schoolId: schoolA.id,
  });
  const orgB1 = row('31000000-0000-4000-8000-000000000004', {
    name: 'Thematic',
    code: 'THEMATIC',
    description: null,
    isActive: true,
    schoolId: schoolB.id,
  });

  const levelA1 = row('32000000-0000-4000-8000-000000000001', {
    name: 'Senior 1',
    code: 'S1',
    levelNumber: 1,
    description: null,
    displayOrder: 11,
    canEnroll: true,
    isTerminal: false,
    isActive: true,
    schoolId: schoolA.id,
    sectionId: sectionA1.id,
    academicOrganizationId: orgA1.id,
  });
  const levelA2 = row('32000000-0000-4000-8000-000000000002', {
    name: 'Senior 2',
    code: 'S2',
    levelNumber: 2,
    description: null,
    displayOrder: 12,
    canEnroll: true,
    isTerminal: false,
    isActive: true,
    schoolId: schoolA.id,
    sectionId: sectionA1.id,
    academicOrganizationId: orgA1.id,
  });
  const levelA3 = row('32000000-0000-4000-8000-000000000003', {
    name: 'Senior 3',
    code: 'S3',
    levelNumber: 3,
    description: null,
    displayOrder: 13,
    canEnroll: true,
    isTerminal: false,
    isActive: true,
    schoolId: schoolA.id,
    sectionId: sectionA1.id,
    academicOrganizationId: orgA1.id,
  });
  const levelA5 = row('32000000-0000-4000-8000-000000000005', {
    name: 'Primary 5',
    code: 'P5',
    levelNumber: 5,
    description: null,
    displayOrder: 5,
    canEnroll: true,
    isTerminal: false,
    isActive: true,
    schoolId: schoolA.id,
    sectionId: sectionA2.id,
    academicOrganizationId: orgA2.id,
  });
  const levelA6 = row('32000000-0000-4000-8000-000000000006', {
    name: 'Primary 6',
    code: 'P6',
    levelNumber: 6,
    description: null,
    displayOrder: 6,
    canEnroll: true,
    isTerminal: false,
    isActive: true,
    schoolId: schoolA.id,
    sectionId: sectionA2.id,
    academicOrganizationId: orgA2.id,
  });
  const levelA7 = row('32000000-0000-4000-8000-000000000007', {
    name: 'Primary 7',
    code: 'P7',
    levelNumber: 7,
    description: null,
    displayOrder: 7,
    canEnroll: true,
    isTerminal: true,
    isActive: true,
    schoolId: schoolA.id,
    sectionId: sectionA2.id,
    academicOrganizationId: orgA2.id,
  });
  const levelB1 = row('32000000-0000-4000-8000-000000000008', {
    name: 'Primary 1',
    code: 'P1',
    levelNumber: 1,
    description: null,
    displayOrder: 1,
    canEnroll: true,
    isTerminal: false,
    isActive: true,
    schoolId: schoolB.id,
    sectionId: sectionB1.id,
    academicOrganizationId: orgB1.id,
  });
  const levelB2 = row('32000000-0000-4000-8000-000000000009', {
    name: 'Senior 1',
    code: 'S1',
    levelNumber: 1,
    description: null,
    displayOrder: 11,
    canEnroll: true,
    isTerminal: false,
    isActive: true,
    schoolId: schoolB.id,
    sectionId: sectionB1.id,
    academicOrganizationId: orgB1.id,
  });

  const progressionA1 = row('33000000-0000-4000-8000-000000000001', {
    fromLevelId: levelA7.id,
    toLevelId: levelA1.id,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolA.id,
  });
  const progressionB1 = row('33000000-0000-4000-8000-000000000002', {
    fromLevelId: levelB1.id,
    toLevelId: levelB2.id,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolB.id,
  });

  const classA1 = row('34000000-0000-4000-8000-000000000001', {
    name: 'Senior 2 A',
    code: 'S2A',
    description: null,
    isActive: true,
    schoolId: schoolA.id,
    academicLevelId: levelA2.id,
  });
  const classA2 = row('34000000-0000-4000-8000-000000000002', {
    name: 'Senior 2 B',
    code: 'S2B',
    description: null,
    isActive: true,
    schoolId: schoolA.id,
    academicLevelId: levelA2.id,
  });
  const classB1 = row('34000000-0000-4000-8000-000000000003', {
    name: 'Senior 1 A',
    code: 'S1A',
    description: null,
    isActive: true,
    schoolId: schoolB.id,
    academicLevelId: levelB2.id,
  });

  const streamA1 = row('35000000-0000-4000-8000-000000000001', {
    name: 'East',
    code: 'E',
    capacity: null,
    isActive: true,
    classId: classA1.id,
  });
  const streamA2 = row('35000000-0000-4000-8000-000000000002', {
    name: 'West',
    code: 'W',
    capacity: null,
    isActive: true,
    classId: classA1.id,
  });
  const streamB1 = row('35000000-0000-4000-8000-000000000003', {
    name: 'East',
    code: 'E',
    capacity: null,
    isActive: true,
    classId: classB1.id,
  });

  const enrollment1 = row('36000000-0000-4000-8000-000000000001', {
    classId: classA1.id,
    streamId: streamA1.id,
    schoolId: schoolA.id,
  });

  const relations: RelationMap = {
    'educationSection.levels': { collection: 'academicLevel', foreignKey: 'sectionId' },
    'academicOrganization.levels': {
      collection: 'academicLevel',
      foreignKey: 'academicOrganizationId',
    },
    'academicLevel.classes': { collection: 'academicClass', foreignKey: 'academicLevelId' },
    'academicLevel.fromProgressions': {
      collection: 'academicLevelProgression',
      foreignKey: 'fromLevelId',
    },
    'academicLevel.toProgressions': {
      collection: 'academicLevelProgression',
      foreignKey: 'toLevelId',
    },
    'academicClass.streams': { collection: 'stream', foreignKey: 'classId' },
    'academicClass.enrollments': { collection: 'enrollment', foreignKey: 'classId' },
    'stream.enrollments': { collection: 'enrollment', foreignKey: 'streamId' },
  };

  function collections() {
    return {
      educationSection: [sectionA1, sectionA2, sectionA3, sectionB1],
      academicOrganization: [orgA1, orgA2, orgA3, orgB1],
      academicLevel: [
        levelA1,
        levelA2,
        levelA3,
        levelA5,
        levelA6,
        levelA7,
        levelB1,
        levelB2,
      ],
      academicLevelProgression: [progressionA1, progressionB1],
      academicClass: [classA1, classA2, classB1],
      stream: [streamA1, streamA2, streamB1],
      enrollment: [enrollment1],
    };
  }

  beforeAll(async () => {
    passwordHash = await new PasswordService().hash(password);
  });

  beforeEach(async () => {
    users = [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        email: 'admin-a@school.example',
        fullName: 'Admin A',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          {
            schoolId: schoolA.id,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date('2024-01-01'),
            school: schoolA,
          },
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
          {
            schoolId: schoolA.id,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date('2024-01-01'),
            school: schoolA,
          },
          {
            schoolId: schoolB.id,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date('2024-02-01'),
            school: schoolB,
          },
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
          {
            schoolId: schoolA.id,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date('2024-01-01'),
            school: schoolA,
          },
        ],
        userRoles: [
          {
            schoolId: schoolA.id,
            roleName: 'TEACHER',
            roleScope: RoleScope.SCHOOL,
            permissionKeys: ['academic_structure.read'],
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
          {
            schoolId: schoolA.id,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date('2024-01-01'),
            school: schoolA,
          },
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

    const prismaMock = {
      ...createIdentityMocks(() => users),
      ...createInMemoryStore(collections, relations),
    };

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
    it('rejects GET /sections without a JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/sections')
        .expect(401);
    });

    it('rejects POST /sections without a JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/sections')
        .send({ name: 'Nursery', code: 'NURSERY' })
        .expect(401);
    });

    it('rejects GET levels without a JWT', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/sections/${sectionA1.id}/levels`)
        .expect(401);
    });
  });

  describe('authorization', () => {
    it('allows GET /sections with academic_structure.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejects GET /sections without academic_structure.read', async () => {
      const token = await loginAs('no-perms@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have permission to perform this action.',
      );
    });

    it('rejects POST /sections without academic_structure.create', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nursery', code: 'NURSERY' })
        .expect(403);
    });

    it('rejects PATCH /sections/:id without academic_structure.update', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/sections/${sectionA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('rejects DELETE /sections/:id without academic_structure.delete', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/sections/${sectionA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects GET /academic-organizations without academic_structure.read', async () => {
      const token = await loginAs('no-perms@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/academic-organizations')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('no active school context', () => {
    it('rejects school-scoped operations without an active school context', async () => {
      const token = await loginAs('super@platform.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'Active school context is required for this operation.',
      );
    });
  });

  describe('section CRUD', () => {
    it('creates a section scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '  Nursery  ',
          code: 'NURSERY',
          description: 'Pre-primary',
          displayOrder: 1,
        })
        .expect(201);

      expect(response.body.name).toBe('Nursery');
      expect(response.body.code).toBe('NURSERY');
      expect(response.body.schoolId).toBe(schoolA.id);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('rejects a duplicate section code within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Primary', code: 'PRIMARY' })
        .expect(409);

      expect(response.body.message).toBe(
        'A section with this code already exists in this school.',
      );
    });

    it('rejects a client-supplied school id', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Nursery',
          code: 'NURSERY',
          schoolId: schoolB.id,
        })
        .expect(400);

      expect(response.body.message).toEqual(expect.any(Array));
    });

    it('lists only sections of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([sectionA1.id, sectionA2.id]));
      expect(ids).not.toContain(sectionB1.id);
    });

    it('gets a section of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/sections/${sectionA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(sectionA1.id);
      expect(response.body.name).toBe('Lower Secondary');
    });

    it('reports a section of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/sections/${sectionB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Section not found.');
    });

    it('rejects a malformed section id', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/sections/not-a-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('updates a section of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/sections/${sectionA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Lower Secondary School', isActive: false })
        .expect(200);

      expect(response.body.name).toBe('Lower Secondary School');
      expect(response.body.isActive).toBe(false);
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('reports updating a section of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/sections/${sectionB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' })
        .expect(404);
    });

    it('refuses to delete a section that still has academic levels', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/sections/${sectionA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete a section that still has academic levels.',
      );
    });

    it('deletes a section with no levels', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/sections/${sectionA3.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const list = await request(app.getHttpServer())
        .get('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = list.body.map((item: { id: string }) => item.id);
      expect(ids).not.toContain(sectionA3.id);
    });

    it('reports deleting a section of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/sections/${sectionB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('academic organization CRUD', () => {
    it('creates an organization scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/academic-organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '  Subject-based  ',
          code: 'SUBJECT_BASED',
          description: 'Subject-based curriculum',
        })
        .expect(201);

      expect(response.body.name).toBe('Subject-based');
      expect(response.body.code).toBe('SUBJECT_BASED');
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects a duplicate organization code within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/academic-organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Thematic', code: 'THEMATIC' })
        .expect(409);
    });

    it('lists only organizations of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/academic-organizations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([orgA1.id, orgA2.id, orgA3.id]));
      expect(ids).not.toContain(orgB1.id);
    });

    it('reports an organization of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/academic-organizations/${orgB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Academic organization not found.');
    });

    it('updates an organization of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/academic-organizations/${orgA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Competency' })
        .expect(200);

      expect(response.body.name).toBe('Competency');
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('refuses to delete an organization still used by academic levels', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/academic-organizations/${orgA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete an academic organization that is still used by academic levels.',
      );
    });

    it('deletes an unused organization', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/academic-organizations/${orgA3.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('level CRUD', () => {
    const createLevelBody = {
      name: 'Senior 4',
      code: 'S4',
      levelNumber: 4,
      academicOrganizationId: orgA1.id,
      displayOrder: 14,
    };

    it('creates a level within the verified section', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/sections/${sectionA1.id}/levels`)
        .set('Authorization', `Bearer ${token}`)
        .send(createLevelBody)
        .expect(201);

      expect(response.body.name).toBe('Senior 4');
      expect(response.body.sectionId).toBe(sectionA1.id);
      expect(response.body.academicOrganizationId).toBe(orgA1.id);
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects creating a level under a section of another school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/sections/${sectionB1.id}/levels`)
        .set('Authorization', `Bearer ${token}`)
        .send(createLevelBody)
        .expect(404);

      expect(response.body.message).toBe('Section not found.');
    });

    it('rejects creating a level with an organization of another school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/sections/${sectionA1.id}/levels`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ...createLevelBody, academicOrganizationId: orgB1.id })
        .expect(404);

      expect(response.body.message).toBe('Academic organization not found.');
    });

    it('rejects a duplicate level code within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/sections/${sectionA1.id}/levels`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ...createLevelBody, code: 'S2' })
        .expect(409);

      expect(response.body.message).toBe(
        'An academic level with this code already exists in this school.',
      );
    });

    it('lists only levels of the requested section', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/sections/${sectionA1.id}/levels`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([levelA1.id, levelA2.id]));
      expect(ids).not.toContain(levelA5.id);
    });

    it('rejects listing levels of a section in another school', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/sections/${sectionB1.id}/levels`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('gets a level within the verified section', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/sections/${sectionA1.id}/levels/${levelA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(levelA2.id);
      expect(response.body.code).toBe('S2');
    });

    it('reports a level of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/sections/${sectionA1.id}/levels/${levelB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('updates a level within the verified section', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/sections/${sectionA1.id}/levels/${levelA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Senior Two', isTerminal: true })
        .expect(200);

      expect(response.body.name).toBe('Senior Two');
      expect(response.body.isTerminal).toBe(true);
    });

    it('refuses to delete a level that still has classes', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/sections/${sectionA1.id}/levels/${levelA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete an academic level that still has classes.',
      );
    });

    it('refuses to delete a level used by progression rules', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/sections/${sectionA1.id}/levels/${levelA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete an academic level that is used by progression rules.',
      );
    });

    it('deletes a level with no classes or progression rules', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/sections/${sectionA1.id}/levels/${levelA3.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('progression CRUD', () => {
    it('creates a progression scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/progressions')
        .set('Authorization', `Bearer ${token}`)
        .send({ fromLevelId: levelA5.id, toLevelId: levelA6.id })
        .expect(201);

      expect(response.body.fromLevelId).toBe(levelA5.id);
      expect(response.body.toLevelId).toBe(levelA6.id);
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects a progression where the level progresses to itself', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/progressions')
        .set('Authorization', `Bearer ${token}`)
        .send({ fromLevelId: levelA1.id, toLevelId: levelA1.id })
        .expect(400);

      expect(response.body.message).toBe('A level cannot progress to itself.');
    });

    it('rejects a progression from a level of another school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/progressions')
        .set('Authorization', `Bearer ${token}`)
        .send({ fromLevelId: levelB1.id, toLevelId: levelA1.id })
        .expect(404);

      expect(response.body.message).toBe('Academic level not found.');
    });

    it('rejects a duplicate progression within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/progressions')
        .set('Authorization', `Bearer ${token}`)
        .send({ fromLevelId: levelA7.id, toLevelId: levelA1.id })
        .expect(409);

      expect(response.body.message).toBe(
        'This progression rule already exists for the school.',
      );
    });

    it('lists only progressions of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/progressions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(progressionA1.id);
      expect(ids).not.toContain(progressionB1.id);
    });

    it('reports a progression of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/progressions/${progressionB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('updates a progression of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/progressions/${progressionA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ displayOrder: 5, isActive: false })
        .expect(200);

      expect(response.body.displayOrder).toBe(5);
      expect(response.body.isActive).toBe(false);
    });

    it('rejects updating a progression so a level progresses to itself', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/progressions/${progressionA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ toLevelId: levelA7.id })
        .expect(400);

      expect(response.body.message).toBe('A level cannot progress to itself.');
    });

    it('reports updating a progression of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/progressions/${progressionB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(404);
    });

    it('deletes a progression of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/progressions/${progressionA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('reports deleting a progression of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/progressions/${progressionB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('class CRUD', () => {
    it('creates a class within the verified level', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/levels/${levelA2.id}/classes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Senior 2 C', code: 'S2C' })
        .expect(201);

      expect(response.body.name).toBe('Senior 2 C');
      expect(response.body.academicLevelId).toBe(levelA2.id);
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects creating a class under a level of another school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/levels/${levelB1.id}/classes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Primary 1 A', code: 'P1A' })
        .expect(404);

      expect(response.body.message).toBe('Academic level not found.');
    });

    it('rejects a duplicate class code within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/levels/${levelA2.id}/classes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Senior 2 A', code: 'S2A' })
        .expect(409);

      expect(response.body.message).toBe(
        'A class with this code already exists in this school.',
      );
    });

    it('lists only classes of the requested level', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/levels/${levelA2.id}/classes`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([classA1.id, classA2.id]));
      expect(ids).not.toContain(classB1.id);
    });

    it('reports a class of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/levels/${levelA2.id}/classes/${classB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('updates a class within the verified level', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/levels/${levelA2.id}/classes/${classA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Senior Two B' })
        .expect(200);

      expect(response.body.name).toBe('Senior Two B');
    });

    it('refuses to delete a class that still has streams', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/levels/${levelA2.id}/classes/${classA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete a class that still has streams.',
      );
    });

    it('deletes a class with no streams or enrollments', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/levels/${levelA2.id}/classes/${classA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('stream CRUD', () => {
    it('creates a stream within the verified class', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/classes/${classA1.id}/streams`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'North', code: 'N', capacity: 40 })
        .expect(201);

      expect(response.body.name).toBe('North');
      expect(response.body.classId).toBe(classA1.id);
    });

    it('rejects creating a stream under a class of another school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/classes/${classB1.id}/streams`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'North', code: 'N' })
        .expect(404);

      expect(response.body.message).toBe('Academic class not found.');
    });

    it('rejects a duplicate stream code within the class', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/classes/${classA1.id}/streams`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'East Again', code: 'E' })
        .expect(409);

      expect(response.body.message).toBe(
        'A stream with this code already exists in this class.',
      );
    });

    it('lists only streams of the requested class', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/classes/${classA1.id}/streams`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([streamA1.id, streamA2.id]));
      expect(ids).not.toContain(streamB1.id);
    });

    it('reports a stream of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/classes/${classA1.id}/streams/${streamB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('updates a stream within the verified class', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/classes/${classA1.id}/streams/${streamA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'West Side', capacity: 45 })
        .expect(200);

      expect(response.body.name).toBe('West Side');
      expect(response.body.capacity).toBe(45);
    });

    it('refuses to clear a previously set capacity', async () => {
      const token = await loginAs('admin-a@school.example');

      const created = await request(app.getHttpServer())
        .post(`/api/v1/classes/${classA1.id}/streams`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'North', code: 'NO', capacity: 40 })
        .expect(201);

      await request(app.getHttpServer())
        .patch(
          `/api/v1/classes/${classA1.id}/streams/${created.body.id}`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ capacity: null })
        .expect(400);
    });

    it('refuses to delete a stream that still has enrollments', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/classes/${classA1.id}/streams/${streamA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete a stream that still has enrollments.',
      );
    });

    it('deletes a stream with no enrollments', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/classes/${classA1.id}/streams/${streamA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('tenant isolation', () => {
    it('never leaks academic structure of the inactive school', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const tokenA = await selectSchool(loginToken, schoolA.id);

      const sectionsA = await request(app.getHttpServer())
        .get('/api/v1/sections')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const sectionIds = sectionsA.body.map((item: { id: string }) => item.id);
      expect(sectionIds).toContain(sectionA1.id);
      expect(sectionIds).not.toContain(sectionB1.id);

      const tokenB = await selectSchool(loginToken, schoolB.id);

      const sectionsB = await request(app.getHttpServer())
        .get('/api/v1/sections')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const sectionIdsB = sectionsB.body.map((item: { id: string }) => item.id);
      expect(sectionIdsB).toContain(sectionB1.id);
      expect(sectionIdsB).not.toContain(sectionA1.id);
    });

    it('ignores a client-supplied school id in the query string', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .query({ schoolId: schoolB.id })
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);
      expect(ids).not.toContain(sectionB1.id);
      expect(ids).toContain(sectionA1.id);
    });

    it('never returns passwordHash in any academic structure response', async () => {
      const token = await loginAs('admin-a@school.example');

      const sections = await request(app.getHttpServer())
        .get('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(JSON.stringify(sections.body)).not.toContain('passwordHash');

      const levels = await request(app.getHttpServer())
        .get(`/api/v1/sections/${sectionA1.id}/levels`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(JSON.stringify(levels.body)).not.toContain('passwordHash');

      const classes = await request(app.getHttpServer())
        .get(`/api/v1/levels/${levelA2.id}/classes`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(JSON.stringify(classes.body)).not.toContain('passwordHash');
    });
  });

  describe('historical integrity', () => {
    it('keeps the seeded structure intact after read-only operations', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/sections/${sectionA1.id}/levels`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const sections = await request(app.getHttpServer())
        .get('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = sections.body.map((item: { id: string }) => item.id);
      expect(ids).toContain(sectionA1.id);
    });
  });

  describe('unexpected Prisma errors', () => {
    it('maps a unique-constraint race to a conflict', async () => {
      const prismaMock = {
        ...createIdentityMocks(() => users),
        ...createInMemoryStore(collections, relations),
      };
      prismaMock.educationSection.create.mockRejectedValueOnce(
        prismaError('P2002'),
      );

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(prismaMock)
        .compile();

      const raceApp = moduleFixture.createNestApplication();
      raceApp.setGlobalPrefix('api/v1');
      raceApp.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      raceApp.useGlobalFilters(new HttpExceptionFilter());
      await raceApp.init();

      const token = await loginAs('admin-a@school.example');

      const response = await request(raceApp.getHttpServer())
        .post('/api/v1/sections')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nursery', code: 'NURSERY' })
        .expect(409);

      expect(response.body.message).toBe(
        'A section with this code already exists in this school.',
      );

      await raceApp.close();
    });
  });
});