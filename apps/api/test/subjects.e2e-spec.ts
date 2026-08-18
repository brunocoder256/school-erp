import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
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
  'subjects.read',
  'subjects.create',
  'subjects.update',
  'subjects.delete',
  'subject_offerings.read',
  'subject_offerings.create',
  'subject_offerings.update',
  'subject_offerings.delete',
  'combinations.read',
  'combinations.create',
  'combinations.update',
  'combinations.delete',
];

function row(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('Subjects (e2e)', () => {
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

  const categoryA1 = row('41000000-0000-4000-8000-000000000001', {
    name: 'Core',
    code: 'CORE',
    description: null,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolA.id,
  });
  const categoryA2 = row('41000000-0000-4000-8000-000000000002', {
    name: 'Elective',
    code: 'ELECTIVE',
    description: null,
    displayOrder: 2,
    isActive: true,
    schoolId: schoolA.id,
  });
  const categoryA3 = row('41000000-0000-4000-8000-000000000003', {
    name: 'Optional',
    code: 'OPTIONAL',
    description: null,
    displayOrder: 3,
    isActive: true,
    schoolId: schoolA.id,
  });
  const categoryB1 = row('41000000-0000-4000-8000-000000000004', {
    name: 'Core',
    code: 'CORE',
    description: null,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolB.id,
  });

  const subjectA1 = row('42000000-0000-4000-8000-000000000001', {
    name: 'Physics',
    code: 'PHY',
    shortName: 'Phy',
    description: null,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolA.id,
    categoryId: categoryA1.id,
  });
  const subjectA2 = row('42000000-0000-4000-8000-000000000002', {
    name: 'Chemistry',
    code: 'CHE',
    shortName: 'Che',
    description: null,
    displayOrder: 2,
    isActive: true,
    schoolId: schoolA.id,
    categoryId: categoryA1.id,
  });
  const subjectA3 = row('42000000-0000-4000-8000-000000000003', {
    name: 'Mathematics',
    code: 'MATH',
    shortName: 'Math',
    description: null,
    displayOrder: 3,
    isActive: true,
    schoolId: schoolA.id,
    categoryId: categoryA1.id,
  });
  const subjectA4 = row('42000000-0000-4000-8000-000000000004', {
    name: 'Biology',
    code: 'BIO',
    shortName: 'Bio',
    description: null,
    displayOrder: 4,
    isActive: true,
    schoolId: schoolA.id,
    categoryId: categoryA2.id,
  });
  const subjectB1 = row('42000000-0000-4000-8000-000000000005', {
    name: 'Physics',
    code: 'PHY',
    shortName: 'Phy',
    description: null,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolB.id,
    categoryId: categoryB1.id,
  });

  const levelA2 = row('43000000-0000-4000-8000-000000000002', {
    name: 'Senior 2',
    code: 'S2',
    levelNumber: 2,
    description: null,
    displayOrder: 12,
    canEnroll: true,
    isTerminal: false,
    isActive: true,
    schoolId: schoolA.id,
  });
  const levelB1 = row('43000000-0000-4000-8000-000000000001', {
    name: 'Primary 1',
    code: 'P1',
    levelNumber: 1,
    description: null,
    displayOrder: 1,
    canEnroll: true,
    isTerminal: false,
    isActive: true,
    schoolId: schoolB.id,
  });

  const yearA1 = row('44000000-0000-4000-8000-000000000001', {
    name: '2026',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    isActive: true,
    schoolId: schoolA.id,
  });
  const yearB1 = row('44000000-0000-4000-8000-000000000002', {
    name: '2026',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    isActive: true,
    schoolId: schoolB.id,
  });

  const offeringA1 = row('45000000-0000-4000-8000-000000000001', {
    isActive: true,
    schoolId: schoolA.id,
    subjectId: subjectA1.id,
    academicLevelId: levelA2.id,
    academicYearId: yearA1.id,
  });
  const offeringA2 = row('45000000-0000-4000-8000-000000000002', {
    isActive: true,
    schoolId: schoolA.id,
    subjectId: subjectA2.id,
    academicLevelId: levelA2.id,
    academicYearId: yearA1.id,
  });
  const offeringB1 = row('45000000-0000-4000-8000-000000000003', {
    isActive: true,
    schoolId: schoolB.id,
    subjectId: subjectB1.id,
    academicLevelId: levelB1.id,
    academicYearId: yearB1.id,
  });

  const comboA1 = row('46000000-0000-4000-8000-000000000001', {
    code: 'PCM',
    name: 'Physics, Chemistry and Mathematics',
    description: null,
    minSubjects: 3,
    maxSubjects: 3,
    isActive: true,
    schoolId: schoolA.id,
    academicLevelId: levelA2.id,
  });
  const comboA2 = row('46000000-0000-4000-8000-000000000002', {
    code: 'HEG',
    name: 'History, Economics and Geography',
    description: null,
    minSubjects: null,
    maxSubjects: null,
    isActive: true,
    schoolId: schoolA.id,
    academicLevelId: levelA2.id,
  });
  const comboB1 = row('46000000-0000-4000-8000-000000000003', {
    code: 'PCM',
    name: 'Physics, Chemistry and Mathematics',
    description: null,
    minSubjects: 3,
    maxSubjects: 3,
    isActive: true,
    schoolId: schoolB.id,
    academicLevelId: levelB1.id,
  });

  const comboA1Members = [
    {
      id: '47000000-0000-4000-8000-000000000001',
      combinationId: comboA1.id,
      subjectId: subjectA1.id,
      isRequired: true,
      displayOrder: 1,
    },
    {
      id: '47000000-0000-4000-8000-000000000002',
      combinationId: comboA1.id,
      subjectId: subjectA2.id,
      isRequired: true,
      displayOrder: 2,
    },
    {
      id: '47000000-0000-4000-8000-000000000003',
      combinationId: comboA1.id,
      subjectId: subjectA3.id,
      isRequired: false,
      displayOrder: 3,
    },
  ];

  const relations: RelationMap = {
    'subjectCategory.subjects': { collection: 'subject', foreignKey: 'categoryId' },
    'subject.offerings': { collection: 'subjectOffering', foreignKey: 'subjectId' },
    'subject.combinations': {
      collection: 'subjectCombinationSubject',
      foreignKey: 'subjectId',
    },
  };

  function collections() {
    return {
      subjectCategory: [categoryA1, categoryA2, categoryA3, categoryB1],
      subject: [subjectA1, subjectA2, subjectA3, subjectA4, subjectB1],
      academicLevel: [levelA2, levelB1],
      academicYear: [yearA1, yearB1],
      subjectOffering: [offeringA1, offeringA2, offeringB1],
      subjectCombination: [comboA1, comboA2, comboB1],
      subjectCombinationSubject: [...comboA1Members],
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
            permissionKeys: [
              'subjects.read',
              'subject_offerings.read',
              'combinations.read',
            ],
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
    it('rejects GET /subjects without a JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/subjects')
        .expect(401);
    });

    it('rejects POST /subject-offerings without a JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/subject-offerings')
        .send({
          subjectId: subjectA1.id,
          academicLevelId: levelA2.id,
          academicYearId: yearA1.id,
        })
        .expect(401);
    });
  });

  describe('authorization', () => {
    it('allows GET /subjects with subjects.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejects GET /subjects without subjects.read', async () => {
      const token = await loginAs('no-perms@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'You do not have permission to perform this action.',
      );
    });

    it('rejects POST /subjects without subjects.create', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'History', code: 'HIS', categoryId: categoryA1.id })
        .expect(403);
    });

    it('rejects GET /subject-offerings without subject_offerings.read', async () => {
      const token = await loginAs('no-perms@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/subject-offerings')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects GET /subject-combinations without combinations.read', async () => {
      const token = await loginAs('no-perms@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/subject-combinations')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('no active school context', () => {
    it('rejects school-scoped operations without an active school context', async () => {
      const token = await loginAs('super@platform.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'Active school context is required for this operation.',
      );
    });
  });

  describe('subject category CRUD', () => {
    it('creates a category scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-categories')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '  Humanities  ',
          code: 'HUMANITIES',
          description: 'Humanities cluster',
        })
        .expect(201);

      expect(response.body.name).toBe('Humanities');
      expect(response.body.code).toBe('HUMANITIES');
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects a duplicate category code within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Core', code: 'CORE' })
        .expect(409);

      expect(response.body.message).toBe(
        'A subject category with this code already exists in this school.',
      );
    });

    it('lists only categories of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subject-categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([categoryA1.id, categoryA2.id]));
      expect(ids).not.toContain(categoryB1.id);
    });

    it('reports a category of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/subject-categories/${categoryB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('updates a category of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/subject-categories/${categoryA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Core Compulsory' })
        .expect(200);

      expect(response.body.name).toBe('Core Compulsory');
    });

    it('refuses to delete a category that still has subjects', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/subject-categories/${categoryA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete a subject category that still has subjects.',
      );
    });

    it('deletes a category with no subjects', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/subject-categories/${categoryA3.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('subject CRUD', () => {
    it('creates a subject scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '  History  ',
          code: 'HIS',
          shortName: '  His  ',
          categoryId: categoryA2.id,
        })
        .expect(201);

      expect(response.body.name).toBe('History');
      expect(response.body.code).toBe('HIS');
      expect(response.body.shortName).toBe('His');
      expect(response.body.categoryId).toBe(categoryA2.id);
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects creating a subject with a category of another school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'History', code: 'HIS', categoryId: categoryB1.id })
        .expect(404);

      expect(response.body.message).toBe('Subject category not found.');
    });

    it('rejects a duplicate subject code within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subjects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Physics', code: 'PHY', categoryId: categoryA1.id })
        .expect(409);

      expect(response.body.message).toBe(
        'A subject with this code already exists in this school.',
      );
    });

    it('lists only subjects of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(
        expect.arrayContaining([subjectA1.id, subjectA2.id, subjectA3.id]),
      );
      expect(ids).not.toContain(subjectB1.id);
    });

    it('reports a subject of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/subjects/${subjectB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Subject not found.');
    });

    it('updates a subject of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/subjects/${subjectA4.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ shortName: 'Bio' })
        .expect(200);

      expect(response.body.shortName).toBe('Bio');
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('refuses to delete a subject that is still offered', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/subjects/${subjectA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete a subject that is still offered.',
      );
    });

    it('refuses to delete a subject still used by a combination', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/subjects/${subjectA3.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete a subject that is still used by a combination.',
      );
    });

    it('deletes an unreferenced subject', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/subjects/${subjectA4.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('subject offering CRUD', () => {
    it('creates an offering scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-offerings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          subjectId: subjectA4.id,
          academicLevelId: levelA2.id,
          academicYearId: yearA1.id,
        })
        .expect(201);

      expect(response.body.subjectId).toBe(subjectA4.id);
      expect(response.body.academicLevelId).toBe(levelA2.id);
      expect(response.body.academicYearId).toBe(yearA1.id);
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects a duplicate offering for the same subject, level and year', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-offerings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          subjectId: subjectA1.id,
          academicLevelId: levelA2.id,
          academicYearId: yearA1.id,
        })
        .expect(409);

      expect(response.body.message).toBe(
        'This subject is already offered for that level and academic year.',
      );
    });

    it('rejects an offering with a subject of another school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-offerings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          subjectId: subjectB1.id,
          academicLevelId: levelA2.id,
          academicYearId: yearA1.id,
        })
        .expect(404);

      expect(response.body.message).toBe('Subject not found.');
    });

    it('rejects an offering at a level of another school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-offerings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          subjectId: subjectA4.id,
          academicLevelId: levelB1.id,
          academicYearId: yearA1.id,
        })
        .expect(404);

      expect(response.body.message).toBe('Academic level not found.');
    });

    it('rejects an offering in a year of another school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-offerings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          subjectId: subjectA4.id,
          academicLevelId: levelA2.id,
          academicYearId: yearB1.id,
        })
        .expect(404);

      expect(response.body.message).toBe('Academic year not found.');
    });

    it('lists only offerings of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subject-offerings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([offeringA1.id, offeringA2.id]));
      expect(ids).not.toContain(offeringB1.id);
    });

    it('reports an offering of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/subject-offerings/${offeringB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('updates an offering of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/subject-offerings/${offeringA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('deletes an offering of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/subject-offerings/${offeringA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('subject combination CRUD', () => {
    const createCombinationBody = {
      code: 'PCB',
      name: 'Physics, Chemistry and Biology',
      academicLevelId: levelA2.id,
      minSubjects: 3,
      maxSubjects: 3,
      subjects: [
        { subjectId: subjectA1.id, isRequired: true },
        { subjectId: subjectA2.id, isRequired: true },
        { subjectId: subjectA4.id },
      ],
    };

    it('creates a combination with its subjects', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-combinations')
        .set('Authorization', `Bearer ${token}`)
        .send(createCombinationBody)
        .expect(201);

      expect(response.body.code).toBe('PCB');
      expect(response.body.academicLevelId).toBe(levelA2.id);
      expect(response.body.schoolId).toBe(schoolA.id);
      expect(response.body.subjects).toHaveLength(3);
    });

    it('rejects a duplicate combination code within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-combinations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...createCombinationBody,
          code: 'PCM',
        })
        .expect(409);

      expect(response.body.message).toBe(
        'A subject combination with this code already exists in this school.',
      );
    });

    it('rejects a combination with inverted min/max bounds', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-combinations')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...createCombinationBody, code: 'PCBX', minSubjects: 4 })
        .expect(400);

      expect(response.body.message).toBe(
        'maxSubjects must not be less than minSubjects.',
      );
    });

    it('rejects a combination where a subject appears twice', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-combinations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...createCombinationBody,
          code: 'PCBX',
          subjects: [
            { subjectId: subjectA1.id },
            { subjectId: subjectA1.id },
          ],
        })
        .expect(400);

      expect(response.body.message).toBe(
        'A subject can only appear once in a combination.',
      );
    });

    it('rejects combination subjects that do not belong to the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-combinations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...createCombinationBody,
          code: 'PCBX',
          subjects: [{ subjectId: subjectB1.id }],
        })
        .expect(400);

      expect(response.body.message).toBe(
        'One or more combination subjects do not belong to this school.',
      );
    });

    it('rejects a combination at a level of another school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-combinations')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...createCombinationBody, code: 'PCBX', academicLevelId: levelB1.id })
        .expect(404);

      expect(response.body.message).toBe('Academic level not found.');
    });

    it('lists only combinations of the active school with their subjects', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subject-combinations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([comboA1.id, comboA2.id]));
      expect(ids).not.toContain(comboB1.id);

      const pcm = response.body.find(
        (item: { id: string }) => item.id === comboA1.id,
      );
      expect(pcm.subjects).toHaveLength(3);
    });

    it('gets a combination of the active school with its subjects', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/subject-combinations/${comboA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(comboA1.id);
      expect(response.body.subjects).toHaveLength(3);
      expect(response.body.subjects[0].subjectId).toBe(subjectA1.id);
    });

    it('reports a combination of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/subject-combinations/${comboB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('updates a combination and replaces its subjects', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/subject-combinations/${comboA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          isActive: false,
          subjects: [{ subjectId: subjectA4.id }],
        })
        .expect(200);

      expect(response.body.isActive).toBe(false);
      expect(response.body.subjects).toHaveLength(1);
      expect(response.body.subjects[0].subjectId).toBe(subjectA4.id);
    });

    it('deletes a combination of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/subject-combinations/${comboA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('reports deleting a combination of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/subject-combinations/${comboB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('tenant isolation', () => {
    it('never leaks subject data of the inactive school', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const tokenA = await selectSchool(loginToken, schoolA.id);

      const subjectsA = await request(app.getHttpServer())
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const subjectIds = subjectsA.body.map((item: { id: string }) => item.id);
      expect(subjectIds).toContain(subjectA1.id);
      expect(subjectIds).not.toContain(subjectB1.id);

      const tokenB = await selectSchool(loginToken, schoolB.id);

      const subjectsB = await request(app.getHttpServer())
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const subjectIdsB = subjectsB.body.map((item: { id: string }) => item.id);
      expect(subjectIdsB).toContain(subjectB1.id);
      expect(subjectIdsB).not.toContain(subjectA1.id);
    });

    it('ignores a client-supplied school id in the query string', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${token}`)
        .query({ schoolId: schoolB.id })
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);
      expect(ids).not.toContain(subjectB1.id);
      expect(ids).toContain(subjectA1.id);
    });

    it('never returns passwordHash in any subject response', async () => {
      const token = await loginAs('admin-a@school.example');

      const subjects = await request(app.getHttpServer())
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(JSON.stringify(subjects.body)).not.toContain('passwordHash');

      const combinations = await request(app.getHttpServer())
        .get('/api/v1/subject-combinations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(JSON.stringify(combinations.body)).not.toContain('passwordHash');
    });
  });
});