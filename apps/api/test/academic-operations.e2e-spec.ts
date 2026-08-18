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
  'subject_allocations.read',
  'subject_allocations.create',
  'subject_allocations.update',
  'teaching_groups.read',
  'teaching_groups.create',
  'teaching_groups.update',
  'student_subjects.read',
  'student_subjects.create',
  'student_subjects.update',
];

const teacherKeys = [
  'subject_allocations.read',
  'teaching_groups.read',
  'student_subjects.read',
];

function row(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('Academic Operations (e2e)', () => {
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

  const levelA1 = row('51000000-0000-4000-8000-000000000001', {
    name: 'Senior Two',
    code: 'S2',
    levelNumber: 2,
    isActive: true,
    schoolId: schoolA.id,
  });
  const levelA2 = row('51000000-0000-4000-8000-000000000002', {
    name: 'Senior Three',
    code: 'S3',
    levelNumber: 3,
    isActive: true,
    schoolId: schoolA.id,
  });
  const levelB1 = row('51000000-0000-4000-8000-000000000003', {
    name: 'Senior One',
    code: 'S1',
    levelNumber: 1,
    isActive: true,
    schoolId: schoolB.id,
  });

  const classA1 = row('52000000-0000-4000-8000-000000000001', {
    name: 'Senior 2 A',
    code: 'S2A',
    isActive: true,
    schoolId: schoolA.id,
    academicLevelId: levelA1.id,
  });
  const classB1 = row('52000000-0000-4000-8000-000000000002', {
    name: 'Senior 1 A',
    code: 'S1A',
    isActive: true,
    schoolId: schoolB.id,
    academicLevelId: levelB1.id,
  });

  const streamA1 = row('53000000-0000-4000-8000-000000000001', {
    name: 'East',
    code: 'E',
    isActive: true,
    classId: classA1.id,
  });
  const streamA2 = row('53000000-0000-4000-8000-000000000002', {
    name: 'West',
    code: 'W',
    isActive: true,
    classId: classA1.id,
  });
  const streamB1 = row('53000000-0000-4000-8000-000000000003', {
    name: 'East',
    code: 'E',
    isActive: true,
    classId: classB1.id,
  });

  const yearA1 = row('54000000-0000-4000-8000-000000000001', {
    name: 'Academic Year 2026',
    code: 'AY2026',
    startDate: '2026-02-01',
    endDate: '2026-11-30',
    isActive: true,
    schoolId: schoolA.id,
  });
  const yearB1 = row('54000000-0000-4000-8000-000000000002', {
    name: 'Academic Year 2026',
    code: 'AY2026',
    startDate: '2026-02-01',
    endDate: '2026-11-30',
    isActive: true,
    schoolId: schoolB.id,
  });

  const subjectA1 = row('55000000-0000-4000-8000-000000000001', {
    name: 'Physics',
    code: 'PHY',
    isActive: true,
    schoolId: schoolA.id,
  });
  const subjectA2 = row('55000000-0000-4000-8000-000000000002', {
    name: 'Chemistry',
    code: 'CHE',
    isActive: true,
    schoolId: schoolA.id,
  });
  const subjectB1 = row('55000000-0000-4000-8000-000000000003', {
    name: 'Physics',
    code: 'PHY',
    isActive: true,
    schoolId: schoolB.id,
  });

  const offeringA1 = row('56000000-0000-4000-8000-000000000001', {
    isActive: true,
    schoolId: schoolA.id,
    subjectId: subjectA1.id,
    academicLevelId: levelA1.id,
    academicYearId: yearA1.id,
  });
  const offeringA2 = row('56000000-0000-4000-8000-000000000002', {
    isActive: true,
    schoolId: schoolA.id,
    subjectId: subjectA2.id,
    academicLevelId: levelA1.id,
    academicYearId: yearA1.id,
  });
  const offeringB1 = row('56000000-0000-4000-8000-000000000003', {
    isActive: true,
    schoolId: schoolB.id,
    subjectId: subjectB1.id,
    academicLevelId: levelB1.id,
    academicYearId: yearB1.id,
  });

  const allocationA1 = row('57000000-0000-4000-8000-000000000001', {
    isActive: true,
    schoolId: schoolA.id,
    academicYearId: yearA1.id,
    academicClassId: classA1.id,
    streamId: streamA1.id,
    subjectOfferingId: offeringA1.id,
  });
  const allocationA2 = row('57000000-0000-4000-8000-000000000002', {
    isActive: true,
    schoolId: schoolA.id,
    academicYearId: yearA1.id,
    academicClassId: classA1.id,
    streamId: streamA2.id,
    subjectOfferingId: offeringA1.id,
  });
  const allocationA3 = row('57000000-0000-4000-8000-000000000003', {
    isActive: true,
    schoolId: schoolA.id,
    academicYearId: yearA1.id,
    academicClassId: classA1.id,
    streamId: null,
    subjectOfferingId: offeringA1.id,
  });
  const allocationB1 = row('57000000-0000-4000-8000-000000000004', {
    isActive: true,
    schoolId: schoolB.id,
    academicYearId: yearB1.id,
    academicClassId: classB1.id,
    streamId: null,
    subjectOfferingId: offeringB1.id,
  });

  const groupA1 = row('58000000-0000-4000-8000-000000000001', {
    name: 'S2A East Physics',
    isActive: true,
    schoolId: schoolA.id,
    academicYearId: yearA1.id,
    academicClassId: classA1.id,
    streamId: streamA1.id,
    subjectId: subjectA1.id,
  });
  const groupB1 = row('58000000-0000-4000-8000-000000000002', {
    name: 'S1A Physics',
    isActive: true,
    schoolId: schoolB.id,
    academicYearId: yearB1.id,
    academicClassId: classB1.id,
    streamId: null,
    subjectId: subjectB1.id,
  });

  const combinationA1 = row('59000000-0000-4000-8000-000000000001', {
    code: 'PCM',
    name: 'Physics, Chemistry and Mathematics',
    description: null,
    minSubjects: 3,
    maxSubjects: 3,
    isActive: true,
    schoolId: schoolA.id,
    academicLevelId: levelA1.id,
  });
  const combinationA2 = row('59000000-0000-4000-8000-000000000002', {
    code: 'PCB',
    name: 'Physics, Chemistry and Biology',
    description: null,
    minSubjects: 3,
    maxSubjects: 3,
    isActive: true,
    schoolId: schoolA.id,
    academicLevelId: levelA2.id,
  });
  const combinationB1 = row('59000000-0000-4000-8000-000000000003', {
    code: 'PCM',
    name: 'Physics, Chemistry and Mathematics',
    description: null,
    minSubjects: 3,
    maxSubjects: 3,
    isActive: true,
    schoolId: schoolB.id,
    academicLevelId: levelB1.id,
  });

  const combinationSubjectA1 = row('5a000000-0000-4000-8000-000000000001', {
    isRequired: true,
    displayOrder: 1,
    combinationId: combinationA1.id,
    subjectId: subjectA1.id,
  });
  const combinationSubjectA2 = row('5a000000-0000-4000-8000-000000000002', {
    isRequired: true,
    displayOrder: 2,
    combinationId: combinationA1.id,
    subjectId: subjectA2.id,
  });
  const combinationSubjectB1 = row('5a000000-0000-4000-8000-000000000003', {
    isRequired: true,
    displayOrder: 1,
    combinationId: combinationB1.id,
    subjectId: subjectB1.id,
  });

  const studentA1 = row('5b000000-0000-4000-8000-000000000001', {
    admissionNumber: 'STU-2026-0001',
    firstName: 'Grace',
    middleName: null,
    lastName: 'Akello',
    preferredName: null,
    gender: 'FEMALE',
    dateOfBirth: '2010-03-15',
    status: 'ACTIVE',
    schoolId: schoolA.id,
  });
  const studentA2 = row('5b000000-0000-4000-8000-000000000002', {
    admissionNumber: 'STU-2026-0002',
    firstName: 'Ivan',
    middleName: null,
    lastName: 'Ssemwanga',
    preferredName: null,
    gender: 'MALE',
    dateOfBirth: '2010-07-20',
    status: 'ACTIVE',
    schoolId: schoolA.id,
  });
  const studentB1 = row('5b000000-0000-4000-8000-000000000003', {
    admissionNumber: 'STU-2026-0101',
    firstName: 'Ann',
    middleName: null,
    lastName: 'Byaruhanga',
    preferredName: null,
    gender: 'FEMALE',
    dateOfBirth: '2011-02-10',
    status: 'ACTIVE',
    schoolId: schoolB.id,
  });

  const enrollmentA1 = row('5c000000-0000-4000-8000-000000000001', {
    status: 'ACTIVE',
    enrollmentDate: '2026-02-01',
    studentId: studentA1.id,
    academicYearId: yearA1.id,
    academicClassId: classA1.id,
    streamId: streamA1.id,
    subjectCombinationId: null,
  });
  const enrollmentA2 = row('5c000000-0000-4000-8000-000000000002', {
    status: 'ACTIVE',
    enrollmentDate: '2026-02-01',
    studentId: studentA2.id,
    academicYearId: yearA1.id,
    academicClassId: classA1.id,
    streamId: streamA1.id,
    subjectCombinationId: null,
  });
  const enrollmentB1 = row('5c000000-0000-4000-8000-000000000003', {
    status: 'ACTIVE',
    enrollmentDate: '2026-02-01',
    studentId: studentB1.id,
    academicYearId: yearB1.id,
    academicClassId: classB1.id,
    streamId: null,
    subjectCombinationId: null,
  });

  const subjectEnrollmentA1 = row('5d000000-0000-4000-8000-000000000001', {
    isActive: true,
    enrollmentId: enrollmentA1.id,
    subjectId: subjectA1.id,
  });

  const relations: RelationMap = {};

  function collections() {
    return {
      academicLevel: [levelA1, levelA2, levelB1],
      academicClass: [classA1, classB1],
      stream: [streamA1, streamA2, streamB1],
      academicYear: [yearA1, yearB1],
      subject: [subjectA1, subjectA2, subjectB1],
      subjectOffering: [offeringA1, offeringA2, offeringB1],
      subjectAllocation: [allocationA1, allocationA2, allocationA3, allocationB1],
      teachingGroup: [groupA1, groupB1],
      subjectCombination: [combinationA1, combinationA2, combinationB1],
      subjectCombinationSubject: [
        combinationSubjectA1,
        combinationSubjectA2,
        combinationSubjectB1,
      ],
      student: [studentA1, studentA2, studentB1],
      enrollment: [enrollmentA1, enrollmentA2, enrollmentB1],
      studentSubjectEnrollment: [subjectEnrollmentA1],
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
            permissionKeys: teacherKeys,
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

    // The identity helper's $transaction closure only sees the identity
    // models; rebind it so transactional services reach the full in-memory
    // store (enrollment combination assignment uses a transaction).
    prismaMock.$transaction = jest.fn(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock),
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
    it('rejects GET /subject-allocations without a JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/subject-allocations')
        .expect(401);
    });

    it('rejects POST /teaching-groups without a JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/teaching-groups')
        .send({})
        .expect(401);
    });

    it('rejects POST /enrollments/:id/subjects without a JWT', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentA1.id}/subjects`)
        .send({ subjectId: subjectA1.id })
        .expect(401);
    });
  });

  describe('authorization', () => {
    it('allows GET /subject-allocations with subject_allocations.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('allows GET /teaching-groups with teaching_groups.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/teaching-groups')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('allows GET /subject-enrollments with student_subjects.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subject-enrollments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejects GET /subject-allocations without the permission', async () => {
      const token = await loginAs('no-perms@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects POST /subject-allocations without subject_allocations.create', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: yearA1.id,
          academicClassId: classA1.id,
          subjectOfferingId: offeringA1.id,
        })
        .expect(403);
    });

    it('rejects POST /teaching-groups without teaching_groups.create', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/teaching-groups')
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: yearA1.id,
          academicClassId: classA1.id,
          subjectId: subjectA1.id,
        })
        .expect(403);
    });

    it('rejects POST /enrollments/:id/subjects without student_subjects.create', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentA1.id}/subjects`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectId: subjectA1.id })
        .expect(403);
    });
  });

  describe('no active school context', () => {
    it('rejects school-scoped operations without an active school context', async () => {
      const token = await loginAs('super@platform.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'Active school context is required for this operation.',
      );
    });
  });

  describe('subject allocations', () => {
    it('creates an allocation scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: yearA1.id,
          academicClassId: classA1.id,
          subjectOfferingId: offeringA2.id,
          isActive: true,
        })
        .expect(201);

      expect(response.body.academicYearId).toBe(yearA1.id);
      expect(response.body.academicClassId).toBe(classA1.id);
      expect(response.body.subjectOfferingId).toBe(offeringA2.id);
      expect(response.body.schoolId).toBe(schoolA.id);
      expect(response.body.streamId).toBeNull();
    });

    it('rejects a duplicate allocation for the same class, stream and offering', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: yearA1.id,
          academicClassId: classA1.id,
          streamId: streamA1.id,
          subjectOfferingId: offeringA1.id,
        })
        .expect(409);

      expect(response.body.message).toBe(
        'This subject is already allocated to that class and stream for the academic year.',
      );
    });

    it('rejects a stream that does not belong to the class', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: yearA1.id,
          academicClassId: classA1.id,
          streamId: streamB1.id,
          subjectOfferingId: offeringA1.id,
        })
        .expect(400);

      expect(response.body.message).toBe(
        'The specified stream does not belong to the specified class.',
      );
    });

    it('reports an offering of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: yearA1.id,
          academicClassId: classA1.id,
          subjectOfferingId: offeringB1.id,
        })
        .expect(404);

      expect(response.body.message).toBe('Subject offering not found.');
    });

    it('lists only allocations of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(
        expect.arrayContaining([allocationA1.id, allocationA2.id]),
      );
      expect(ids).not.toContain(allocationB1.id);
    });

    it('filters allocations by subject', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${token}`)
        .query({ subjectId: subjectA1.id })
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(allocationA1.id);
      expect(ids).not.toContain(allocationB1.id);
    });

    it('gets an allocation of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/subject-allocations/${allocationA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(allocationA1.id);
      expect(response.body.subjectOfferingId).toBe(offeringA1.id);
    });

    it('reports an allocation of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/subject-allocations/${allocationB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Subject allocation not found.');
    });

    it('deactivates an allocation of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/subject-allocations/${allocationA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('rejects a client-supplied school id', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: yearA1.id,
          academicClassId: classA1.id,
          subjectOfferingId: offeringA1.id,
          schoolId: schoolB.id,
        })
        .expect(400);
    });
  });

  describe('teaching groups', () => {
    it('creates a class-level group for an allocated subject', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/teaching-groups')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'S2A Physics',
          academicYearId: yearA1.id,
          academicClassId: classA1.id,
          subjectId: subjectA1.id,
        })
        .expect(201);

      expect(response.body.academicClassId).toBe(classA1.id);
      expect(response.body.subjectId).toBe(subjectA1.id);
      expect(response.body.streamId).toBeNull();
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects a group for a subject that is not allocated to the context', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/teaching-groups')
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: yearA1.id,
          academicClassId: classA1.id,
          streamId: streamA1.id,
          subjectId: subjectA2.id,
        })
        .expect(409);

      expect(response.body.message).toBe(
        'The subject must be allocated to this class and stream for the academic year before a teaching group can be created.',
      );
    });

    it('rejects a duplicate group for the same context', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/teaching-groups')
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: yearA1.id,
          academicClassId: classA1.id,
          streamId: streamA1.id,
          subjectId: subjectA1.id,
        })
        .expect(409);

      expect(response.body.message).toBe(
        'A teaching group already exists for that class, stream, subject and academic year.',
      );
    });

    it('reports an academic year of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/teaching-groups')
        .set('Authorization', `Bearer ${token}`)
        .send({
          academicYearId: yearB1.id,
          academicClassId: classA1.id,
          subjectId: subjectA1.id,
        })
        .expect(404);
    });

    it('lists only groups of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/teaching-groups')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(groupA1.id);
      expect(ids).not.toContain(groupB1.id);
    });

    it('reports a group of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teaching-groups/${groupB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Teaching group not found.');
    });

    it('renames and deactivates a group of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/teaching-groups/${groupA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'S2A East Physics A', isActive: false })
        .expect(200);

      expect(response.body.name).toBe('S2A East Physics A');
      expect(response.body.isActive).toBe(false);
    });

    it('resolves the students of a group context', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teaching-groups/${groupA1.id}/students`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map(
        (item: { student: { id: string } }) => item.student.id,
      );

      expect(ids).toEqual(expect.arrayContaining([studentA1.id, studentA2.id]));
    });
  });

  describe('student subject enrollments', () => {
    it('enrolls a student in an allocated subject of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentA2.id}/subjects`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectId: subjectA1.id })
        .expect(201);

      expect(response.body.enrollmentId).toBe(enrollmentA2.id);
      expect(response.body.subjectId).toBe(subjectA1.id);
      expect(response.body.isActive).toBe(true);
    });

    it('rejects a subject that is not allocated to the class and stream', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentA1.id}/subjects`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectId: subjectA2.id })
        .expect(409);

      expect(response.body.message).toBe(
        "The subject must be allocated to this student's class and stream for the academic year before they can be enrolled in it.",
      );
    });

    it('rejects a duplicate subject enrollment', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentA1.id}/subjects`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectId: subjectA1.id })
        .expect(409);

      expect(response.body.message).toBe(
        'The student is already enrolled in this subject for the academic year.',
      );
    });

    it('reports a subject of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentA1.id}/subjects`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectId: subjectB1.id })
        .expect(404);

      expect(response.body.message).toBe('Subject not found.');
    });

    it('reports an enrollment of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentB1.id}/subjects`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectId: subjectA1.id })
        .expect(404);
    });

    it('lists the subjects of an enrollment of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${enrollmentA1.id}/subjects`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(subjectEnrollmentA1.id);
    });

    it('deactivates a subject enrollment of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(
          `/api/v1/enrollments/${enrollmentA1.id}/subjects/${subjectEnrollmentA1.id}`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('reports deactivating a subject enrollment of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .patch(
          `/api/v1/enrollments/${enrollmentB1.id}/subjects/${subjectEnrollmentA1.id}`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(404);
    });

    it('lists subject enrollments scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/subject-enrollments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(subjectEnrollmentA1.id);
    });
  });

  describe('subject combinations', () => {
    it('assigns a combination and enrolls its allocated subjects', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentA2.id}/combination`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectCombinationId: combinationA1.id })
        .expect(201);

      expect(response.body.enrollmentId).toBe(enrollmentA2.id);
      expect(response.body.subjectCombinationId).toBe(combinationA1.id);
      expect(response.body.code).toBe('PCM');
      expect(response.body.subjects).toEqual([subjectA1.id, subjectA2.id]);
      expect(response.body.enrolledSubjectIds).toEqual([subjectA1.id]);
    });

    it('rejects a combination whose level does not match the enrollment class', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentA1.id}/combination`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectCombinationId: combinationA2.id })
        .expect(400);

      expect(response.body.message).toBe(
        'The subject combination level must match the level of the enrollment class.',
      );
    });

    it('reports a combination of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentA1.id}/combination`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectCombinationId: combinationB1.id })
        .expect(404);

      expect(response.body.message).toBe('Subject combination not found.');
    });

    it('only records the combination when subject enrollment is disabled', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentA2.id}/combination`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectCombinationId: combinationA1.id, enrollSubjects: false })
        .expect(201);

      expect(response.body.subjectCombinationId).toBe(combinationA1.id);
      expect(response.body.enrolledSubjectIds).toEqual([]);
    });

    it('returns the assigned combination of an enrollment', async () => {
      const token = await loginAs('admin-a@school.example');

      const set = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${enrollmentA2.id}/combination`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectCombinationId: combinationA1.id })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${enrollmentA2.id}/combination`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.subjectCombinationId).toBe(combinationA1.id);
      expect(response.body.code).toBe('PCM');
      expect(response.body.subjects).toEqual([subjectA1.id, subjectA2.id]);
      expect(response.body.enrolledSubjectIds).toEqual(
        set.body.enrolledSubjectIds,
      );
    });

    it('returns nulls for an enrollment without a combination', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${enrollmentA1.id}/combination`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.subjectCombinationId).toBeNull();
      expect(response.body.subjects).toEqual([]);
    });

    it('reports an enrollment of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${enrollmentB1.id}/combination`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('tenant isolation', () => {
    it('never leaks academic operations data of the inactive school', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const tokenA = await selectSchool(loginToken, schoolA.id);

      const allocationsA = await request(app.getHttpServer())
        .get('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const allocationIdsA = allocationsA.body.map(
        (item: { id: string }) => item.id,
      );
      expect(allocationIdsA).toContain(allocationA1.id);
      expect(allocationIdsA).not.toContain(allocationB1.id);

      const groupsA = await request(app.getHttpServer())
        .get('/api/v1/teaching-groups')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const groupIdsA = groupsA.body.map((item: { id: string }) => item.id);
      expect(groupIdsA).toContain(groupA1.id);
      expect(groupIdsA).not.toContain(groupB1.id);

      const tokenB = await selectSchool(loginToken, schoolB.id);

      const allocationsB = await request(app.getHttpServer())
        .get('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const allocationIdsB = allocationsB.body.map(
        (item: { id: string }) => item.id,
      );
      expect(allocationIdsB).toContain(allocationB1.id);
      expect(allocationIdsB).not.toContain(allocationA1.id);
    });

    it('rejects a client-supplied school id in the query string', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/subject-allocations')
        .set('Authorization', `Bearer ${token}`)
        .query({ schoolId: schoolB.id })
        .expect(400);
    });
  });
});