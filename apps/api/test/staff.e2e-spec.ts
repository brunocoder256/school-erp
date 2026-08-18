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
  'staff.read',
  'staff.create',
  'staff.update',
  'staff.delete',
  'teacher_assignments.read',
  'teacher_assignments.create',
  'teacher_assignments.update',
  'teacher_assignments.delete',
];

const teacherKeys = ['staff.read', 'teacher_assignments.read'];

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

describe('Staff Management (e2e)', () => {
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
    name: 'Teaching',
    code: 'TEACHING',
    description: null,
    displayOrder: 0,
    isActive: true,
    schoolId: schoolA.id,
  });
  const categoryA2 = row('41000000-0000-4000-8000-000000000002', {
    name: 'Non-Teaching',
    code: 'NON_TEACHING',
    description: null,
    displayOrder: 1,
    isActive: true,
    schoolId: schoolA.id,
  });
  const categoryB1 = row('41000000-0000-4000-8000-000000000003', {
    name: 'Teaching',
    code: 'TEACHING',
    description: null,
    displayOrder: 0,
    isActive: true,
    schoolId: schoolB.id,
  });

  const deptA1 = row('42000000-0000-4000-8000-000000000001', {
    name: 'Science',
    code: 'SCIENCE',
    description: null,
    isActive: true,
    schoolId: schoolA.id,
  });
  const deptA2 = row('42000000-0000-4000-8000-000000000002', {
    name: 'Languages',
    code: 'LANGUAGES',
    description: null,
    isActive: true,
    schoolId: schoolA.id,
  });
  const deptB1 = row('42000000-0000-4000-8000-000000000003', {
    name: 'Science',
    code: 'SCIENCE',
    description: null,
    isActive: true,
    schoolId: schoolB.id,
  });

  const positionA1 = row('43000000-0000-4000-8000-000000000001', {
    name: 'Teacher',
    code: 'TEACHER',
    description: null,
    isActive: true,
    schoolId: schoolA.id,
  });
  const positionA2 = row('43000000-0000-4000-8000-000000000002', {
    name: 'Head Teacher',
    code: 'HEAD_TEACHER',
    description: null,
    isActive: true,
    schoolId: schoolA.id,
  });
  const positionB1 = row('43000000-0000-4000-8000-000000000003', {
    name: 'Teacher',
    code: 'TEACHER',
    description: null,
    isActive: true,
    schoolId: schoolB.id,
  });

  const staffA1 = row('44000000-0000-4000-8000-000000000001', {
    staffNumber: 'STF001',
    firstName: 'John',
    middleName: null,
    lastName: 'Okello',
    preferredName: null,
    email: 'john.okello@example.com',
    phone: '+256700000001',
    alternativePhone: null,
    dateOfBirth: null,
    gender: null,
    nationalId: null,
    address: null,
    employmentStatus: 'ACTIVE',
    employmentType: null,
    joiningDate: null,
    leavingDate: null,
    notes: null,
    staffCategoryId: categoryA1.id,
    departmentId: deptA1.id,
    positionId: positionA1.id,
    userId: null,
    schoolId: schoolA.id,
  });
  const staffA2 = row('44000000-0000-4000-8000-000000000002', {
    staffNumber: 'STF002',
    firstName: 'Mary',
    middleName: null,
    lastName: 'Nakato',
    preferredName: null,
    email: null,
    phone: null,
    alternativePhone: null,
    dateOfBirth: null,
    gender: null,
    nationalId: null,
    address: null,
    employmentStatus: 'LEFT',
    employmentType: null,
    joiningDate: null,
    leavingDate: null,
    notes: null,
    staffCategoryId: null,
    departmentId: null,
    positionId: null,
    userId: null,
    schoolId: schoolA.id,
  });
  const staffB1 = row('44000000-0000-4000-8000-000000000003', {
    staffNumber: 'STF010',
    firstName: 'Ann',
    middleName: null,
    lastName: 'Byaruhanga',
    preferredName: null,
    email: null,
    phone: null,
    alternativePhone: null,
    dateOfBirth: null,
    gender: null,
    nationalId: null,
    address: null,
    employmentStatus: 'ACTIVE',
    employmentType: null,
    joiningDate: null,
    leavingDate: null,
    notes: null,
    staffCategoryId: categoryB1.id,
    departmentId: deptB1.id,
    positionId: positionB1.id,
    userId: null,
    schoolId: schoolB.id,
  });

  const yearA1 = row('45000000-0000-4000-8000-000000000001', {
    name: 'Academic Year 2026',
    code: 'AY2026',
    startDate: '2026-02-01',
    endDate: '2026-11-30',
    isActive: true,
    schoolId: schoolA.id,
  });
  const yearB1 = row('45000000-0000-4000-8000-000000000002', {
    name: 'Academic Year 2026',
    code: 'AY2026',
    startDate: '2026-02-01',
    endDate: '2026-11-30',
    isActive: true,
    schoolId: schoolB.id,
  });

  const subjectA1 = row('46000000-0000-4000-8000-000000000001', {
    name: 'Physics',
    code: 'PHY',
    description: null,
    isActive: true,
    schoolId: schoolA.id,
  });
  const subjectB1 = row('46000000-0000-4000-8000-000000000002', {
    name: 'Physics',
    code: 'PHY',
    description: null,
    isActive: true,
    schoolId: schoolB.id,
  });

  const classA1 = row('47000000-0000-4000-8000-000000000001', {
    name: 'Senior 2 A',
    code: 'S2A',
    description: null,
    isActive: true,
    schoolId: schoolA.id,
    academicLevelId: null,
  });
  const classB1 = row('47000000-0000-4000-8000-000000000002', {
    name: 'Senior 1 A',
    code: 'S1A',
    description: null,
    isActive: true,
    schoolId: schoolB.id,
    academicLevelId: null,
  });

  const streamA1 = row('48000000-0000-4000-8000-000000000001', {
    name: 'East',
    code: 'E',
    capacity: null,
    isActive: true,
    classId: classA1.id,
  });
  const streamA2 = row('48000000-0000-4000-8000-000000000002', {
    name: 'West',
    code: 'W',
    capacity: null,
    isActive: true,
    classId: classA1.id,
  });
  const streamB1 = row('48000000-0000-4000-8000-000000000003', {
    name: 'East',
    code: 'E',
    capacity: null,
    isActive: true,
    classId: classB1.id,
  });

  const qualificationA1 = row('49000000-0000-4000-8000-000000000001', {
    staffId: staffA1.id,
    name: 'Bachelor of Education',
    institution: 'Makerere University',
    qualificationType: 'Degree',
    fieldOfStudy: 'Physics',
    awardDate: '2012-06-15',
    grade: 'Second Class Upper',
    certificateNumber: 'CERT-0001',
  });

  const capabilityA1 = row('4a000000-0000-4000-8000-000000000001', {
    staffId: staffA1.id,
    subjectId: subjectA1.id,
    isPrimary: true,
  });

  const profileA1 = row('4b000000-0000-4000-8000-000000000001', {
    staffId: staffA1.id,
    specialization: 'Physics',
    yearsOfExperience: 8,
    professionalQualification: 'B.Ed',
    registrationNumber: null,
    registrationBody: null,
    registrationDate: null,
    registrationExpiryDate: null,
    registrationStatus: null,
    highestAcademicQualification: null,
  });

  const responsibilityA1 = row('4c000000-0000-4000-8000-000000000001', {
    staffId: staffA1.id,
    type: 'Class Teacher',
    isActive: true,
    academicYearId: yearA1.id,
    classId: classA1.id,
    streamId: streamA1.id,
    departmentId: null,
  });

  const assignmentA1 = row('4d000000-0000-4000-8000-000000000001', {
    staffId: staffA1.id,
    academicYearId: yearA1.id,
    subjectId: subjectA1.id,
    academicClassId: classA1.id,
    streamId: streamA1.id,
    isActive: true,
    schoolId: schoolA.id,
  });
  const assignmentB1 = row('4d000000-0000-4000-8000-000000000002', {
    staffId: staffB1.id,
    academicYearId: yearB1.id,
    subjectId: subjectB1.id,
    academicClassId: classB1.id,
    streamId: null,
    isActive: true,
    schoolId: schoolB.id,
  });

  const relations: RelationMap = {
    'department.staffMembers': { collection: 'staff', foreignKey: 'departmentId' },
    'department.responsibilities': {
      collection: 'staffResponsibility',
      foreignKey: 'departmentId',
    },
    'staffCategory.staffMembers': {
      collection: 'staff',
      foreignKey: 'staffCategoryId',
    },
    'staffPosition.staffMembers': {
      collection: 'staff',
      foreignKey: 'positionId',
    },
  };

  function collections() {
    return {
      staffCategory: [categoryA1, categoryA2, categoryB1],
      department: [deptA1, deptA2, deptB1],
      staffPosition: [positionA1, positionA2, positionB1],
      staff: [staffA1, staffA2, staffB1],
      academicYear: [yearA1, yearB1],
      subject: [subjectA1, subjectB1],
      academicClass: [classA1, classB1],
      stream: [streamA1, streamA2, streamB1],
      staffQualification: [qualificationA1],
      teacherSubjectCapability: [capabilityA1],
      teacherProfile: [profileA1],
      staffResponsibility: [responsibilityA1],
      teachingAssignment: [assignmentA1, assignmentB1],
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
      {
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        email: 'invited@school.example',
        fullName: 'Invited Member',
        passwordHash,
        status: UserStatus.ACTIVE,
        memberships: [
          {
            schoolId: schoolA.id,
            status: MembershipStatus.INVITED,
            joinedAt: new Date('2024-03-01'),
            school: schoolA,
          },
        ],
        userRoles: [],
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
    it('rejects GET /staff without a JWT', async () => {
      await request(app.getHttpServer()).get('/api/v1/staff').expect(401);
    });

    it('rejects POST /staff without a JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/staff')
        .send({ staffNumber: 'STF099', firstName: 'A', lastName: 'B' })
        .expect(401);
    });

    it('rejects POST /teaching-assignments without a JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/teaching-assignments')
        .send({})
        .expect(401);
    });
  });

  describe('authorization', () => {
    it('allows GET /staff with staff.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejects GET /staff without staff.read', async () => {
      const token = await loginAs('no-perms@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects POST /staff without staff.create', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({ staffNumber: 'STF099', firstName: 'A', lastName: 'B' })
        .expect(403);
    });

    it('rejects POST /teaching-assignments without teacher_assignments.create', async () => {
      const token = await loginAs('teacher-a@school.example');

      await request(app.getHttpServer())
        .post('/api/v1/teaching-assignments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          staffId: staffA1.id,
          academicYearId: yearA1.id,
          subjectId: subjectA1.id,
          academicClassId: classA1.id,
        })
        .expect(403);
    });

    it('allows GET /teaching-assignments with teacher_assignments.read', async () => {
      const token = await loginAs('teacher-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/teaching-assignments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('no active school context', () => {
    it('rejects school-scoped operations without an active school context', async () => {
      const token = await loginAs('super@platform.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe(
        'Active school context is required for this operation.',
      );
    });
  });

  describe('staff CRUD', () => {
    it('creates a staff member scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({
          staffNumber: 'STF100',
          firstName: '  Grace  ',
          lastName: 'Achieng',
          email: 'grace.achieng@example.com',
        })
        .expect(201);

      expect(response.body.staffNumber).toBe('STF100');
      expect(response.body.firstName).toBe('Grace');
      expect(response.body.email).toBe('grace.achieng@example.com');
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects a duplicate staff number within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({ staffNumber: 'STF001', firstName: 'John', lastName: 'Okello' })
        .expect(409);

      expect(response.body.message).toBe(
        'A staff member with this staff number already exists in this school.',
      );
    });

    it('rejects a client-supplied school id', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({
          staffNumber: 'STF101',
          firstName: 'Grace',
          lastName: 'Achieng',
          schoolId: schoolB.id,
        })
        .expect(400);

      expect(response.body.message).toEqual(expect.any(Array));
    });

    it('rejects linking a user without an active membership in the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({
          staffNumber: 'STF102',
          firstName: 'Grace',
          lastName: 'Achieng',
          userId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        })
        .expect(400);

      expect(response.body.message).toBe(
        'The linked user is not an active member of this school.',
      );
    });

    it('lists only staff of the active school with summary fields', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([staffA1.id, staffA2.id]));
      expect(ids).not.toContain(staffB1.id);
    });

    it('does not expose sensitive fields in the list response', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const json = JSON.stringify(response.body);
      expect(json).not.toContain('john.okello@example.com');
      expect(json).not.toContain('+256700000001');
    });

    it('filters staff by status', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .query({ status: 'ACTIVE' })
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(staffA1.id);
      expect(ids).not.toContain(staffA2.id);
    });

    it('searches staff by name', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .query({ search: 'nakato' })
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(staffA2.id);
      expect(ids).not.toContain(staffA1.id);
    });

    it('gets the detail of a staff member of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/staff/${staffA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(staffA1.id);
      expect(response.body.email).toBe('john.okello@example.com');
      expect(response.body.phone).toBe('+256700000001');
    });

    it('reports a staff member of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/staff/${staffB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Staff member not found.');
    });

    it('rejects a malformed staff id', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/staff/not-a-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('updates a staff member of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/staff/${staffA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Jonathan', employmentStatus: 'INACTIVE' })
        .expect(200);

      expect(response.body.firstName).toBe('Jonathan');
      expect(response.body.employmentStatus).toBe('INACTIVE');
    });

    it('reports updating a staff member of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .patch(`/api/v1/staff/${staffB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Hacked' })
        .expect(404);
    });
  });

  describe('department CRUD', () => {
    it('creates a department scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '  Mathematics  ', code: 'MATHEMATICS' })
        .expect(201);

      expect(response.body.name).toBe('Mathematics');
      expect(response.body.code).toBe('MATHEMATICS');
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects a duplicate department code within the school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Science', code: 'SCIENCE' })
        .expect(409);

      expect(response.body.message).toBe(
        'A department with this code already exists in this school.',
      );
    });

    it('lists only departments of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([deptA1.id, deptA2.id]));
      expect(ids).not.toContain(deptB1.id);
    });

    it('reports a department of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/departments/${deptB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Department not found.');
    });

    it('updates a department of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/departments/${deptA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Languages and Literature', isActive: false })
        .expect(200);

      expect(response.body.name).toBe('Languages and Literature');
      expect(response.body.isActive).toBe(false);
    });

    it('refuses to delete a department that still has staff members', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/departments/${deptA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete a department that still has staff members.',
      );
    });

    it('deletes an unreferenced department', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/departments/${deptA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('reports deleting a department of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/departments/${deptB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('staff category CRUD', () => {
    it('creates a staff category scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/staff-categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Support', code: 'SUPPORT', displayOrder: 3 })
        .expect(201);

      expect(response.body.code).toBe('SUPPORT');
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('lists only staff categories of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/staff-categories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([categoryA1.id, categoryA2.id]));
      expect(ids).not.toContain(categoryB1.id);
    });

    it('refuses to delete a staff category that still has staff members', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/staff-categories/${categoryA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete a staff category that still has staff members.',
      );
    });

    it('deletes an unreferenced staff category', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/staff-categories/${categoryA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('staff position CRUD', () => {
    it('creates a staff position scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/staff-positions')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Director of Studies', code: 'DIRECTOR_OF_STUDIES' })
        .expect(201);

      expect(response.body.code).toBe('DIRECTOR_OF_STUDIES');
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('lists only staff positions of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/staff-positions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toEqual(expect.arrayContaining([positionA1.id, positionA2.id]));
      expect(ids).not.toContain(positionB1.id);
    });

    it('refuses to delete a staff position still held by staff members', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/staff-positions/${positionA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.message).toBe(
        'Cannot delete a staff position that is still held by staff members.',
      );
    });

    it('deletes an unheld staff position', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/staff-positions/${positionA2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('teacher profile', () => {
    it('reports a missing teacher profile as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/staff/${staffA2.id}/teacher-profile`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Teacher profile not found.');
    });

    it('reports a teacher profile of a staff member of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get(`/api/v1/staff/${staffB1.id}/teacher-profile`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('returns the teacher profile of a staff member of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/staff/${staffA1.id}/teacher-profile`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.staffId).toBe(staffA1.id);
      expect(response.body.specialization).toBe('Physics');
    });

    it('creates the teacher profile on first write', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .put(`/api/v1/staff/${staffA2.id}/teacher-profile`)
        .set('Authorization', `Bearer ${token}`)
        .send({ specialization: 'Biology', yearsOfExperience: 5 })
        .expect(200);

      expect(response.body.staffId).toBe(staffA2.id);
      expect(response.body.specialization).toBe('Biology');
      expect(response.body.yearsOfExperience).toBe(5);
    });

    it('updates an existing teacher profile', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .put(`/api/v1/staff/${staffA1.id}/teacher-profile`)
        .set('Authorization', `Bearer ${token}`)
        .send({ yearsOfExperience: 12 })
        .expect(200);

      expect(response.body.staffId).toBe(staffA1.id);
      expect(response.body.specialization).toBe('Physics');
      expect(response.body.yearsOfExperience).toBe(12);
    });
  });

  describe('qualifications', () => {
    it('creates a qualification for a staff member of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/staff/${staffA2.id}/qualifications`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Diploma in Education',
          institution: 'Kyambogo University',
        })
        .expect(201);

      expect(response.body.name).toBe('Diploma in Education');
      expect(response.body.staffId).toBe(staffA2.id);
    });

    it('reports a staff member of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .post(`/api/v1/staff/${staffB1.id}/qualifications`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Degree' })
        .expect(404);
    });

    it('lists only qualifications of the requested staff member', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/staff/${staffA1.id}/qualifications`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(qualificationA1.id);
    });

    it('updates a qualification of the staff member', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/staff/${staffA1.id}/qualifications/${qualificationA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ grade: 'First Class' })
        .expect(200);

      expect(response.body.grade).toBe('First Class');
    });

    it('deletes a qualification of the staff member', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/staff/${staffA1.id}/qualifications/${qualificationA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('subject capabilities', () => {
    it('creates a subject capability for a staff member of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/staff/${staffA2.id}/subject-capabilities`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectId: subjectA1.id, isPrimary: true })
        .expect(201);

      expect(response.body.staffId).toBe(staffA2.id);
      expect(response.body.subjectId).toBe(subjectA1.id);
    });

    it('rejects a duplicate capability for the same subject', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/staff/${staffA1.id}/subject-capabilities`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectId: subjectA1.id })
        .expect(409);

      expect(response.body.message).toBe(
        'This staff member already has a capability for that subject.',
      );
    });

    it('reports a subject of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/staff/${staffA1.id}/subject-capabilities`)
        .set('Authorization', `Bearer ${token}`)
        .send({ subjectId: subjectB1.id })
        .expect(404);

      expect(response.body.message).toBe('Subject not found.');
    });

    it('lists capabilities of the requested staff member', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/staff/${staffA1.id}/subject-capabilities`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(capabilityA1.id);
    });

    it('deletes a capability of the staff member', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .delete(`/api/v1/staff/${staffA1.id}/subject-capabilities/${capabilityA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('responsibilities', () => {
    it('creates a responsibility for a staff member of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/staff/${staffA2.id}/responsibilities`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'Class Teacher', academicYearId: yearA1.id })
        .expect(201);

      expect(response.body.staffId).toBe(staffA2.id);
      expect(response.body.type).toBe('Class Teacher');
      expect(response.body.academicYearId).toBe(yearA1.id);
    });

    it('rejects a stream that does not belong to the class', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/staff/${staffA2.id}/responsibilities`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'Class Teacher',
          academicYearId: yearA1.id,
          classId: classA1.id,
          streamId: streamB1.id,
        })
        .expect(400);

      expect(response.body.message).toBe(
        'The specified stream does not belong to the specified class.',
      );
    });

    it('rejects a stream without a class', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post(`/api/v1/staff/${staffA2.id}/responsibilities`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'Class Teacher',
          academicYearId: yearA1.id,
          streamId: streamA1.id,
        })
        .expect(400);

      expect(response.body.message).toBe(
        'A stream cannot be assigned without a class.',
      );
    });

    it('lists responsibilities of the requested staff member', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/staff/${staffA1.id}/responsibilities`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(responsibilityA1.id);
    });

    it('updates a responsibility of the staff member', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(
          `/api/v1/staff/${staffA1.id}/responsibilities/${responsibilityA1.id}`,
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });
  });

  describe('teaching assignments', () => {
    it('creates a teaching assignment scoped to the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/teaching-assignments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          staffId: staffA1.id,
          academicYearId: yearA1.id,
          subjectId: subjectA1.id,
          academicClassId: classA1.id,
          streamId: streamA2.id,
        })
        .expect(201);

      expect(response.body.staffId).toBe(staffA1.id);
      expect(response.body.schoolId).toBe(schoolA.id);
    });

    it('rejects assigning an inactive staff member', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/teaching-assignments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          staffId: staffA2.id,
          academicYearId: yearA1.id,
          subjectId: subjectA1.id,
          academicClassId: classA1.id,
        })
        .expect(409);

      expect(response.body.message).toBe(
        'An inactive staff member cannot receive new active teaching assignments.',
      );
    });

    it('rejects a duplicate assignment for the same combination', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/teaching-assignments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          staffId: staffA1.id,
          academicYearId: yearA1.id,
          subjectId: subjectA1.id,
          academicClassId: classA1.id,
          streamId: streamA1.id,
        })
        .expect(409);

      expect(response.body.message).toBe(
        'This teaching assignment already exists for the school.',
      );
    });

    it('rejects a stream that does not belong to the class', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/teaching-assignments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          staffId: staffA1.id,
          academicYearId: yearA1.id,
          subjectId: subjectA1.id,
          academicClassId: classA1.id,
          streamId: streamB1.id,
        })
        .expect(400);

      expect(response.body.message).toBe(
        'The specified stream does not belong to the specified class.',
      );
    });

    it('reports a staff member of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .post('/api/v1/teaching-assignments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          staffId: staffB1.id,
          academicYearId: yearA1.id,
          subjectId: subjectA1.id,
          academicClassId: classA1.id,
        })
        .expect(404);

      expect(response.body.message).toBe('Staff member not found.');
    });

    it('lists only assignments of the active school', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get('/api/v1/teaching-assignments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = response.body.map((item: { id: string }) => item.id);

      expect(ids).toContain(assignmentA1.id);
      expect(ids).not.toContain(assignmentB1.id);
    });

    it('reports an assignment of another school as not found', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teaching-assignments/${assignmentB1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Teaching assignment not found.');
    });

    it('deactivates an assignment instead of deleting it', async () => {
      const token = await loginAs('admin-a@school.example');

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/teaching-assignments/${assignmentA1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });
  });

  describe('tenant isolation', () => {
    it('never leaks staff data of the inactive school', async () => {
      const loginToken = await loginAs('admin-ab@school.example');
      const tokenA = await selectSchool(loginToken, schoolA.id);

      const staffA = await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const staffIdsA = staffA.body.map((item: { id: string }) => item.id);
      expect(staffIdsA).toContain(staffA1.id);
      expect(staffIdsA).not.toContain(staffB1.id);

      const tokenB = await selectSchool(loginToken, schoolB.id);

      const staffB = await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const staffIdsB = staffB.body.map((item: { id: string }) => item.id);
      expect(staffIdsB).toContain(staffB1.id);
      expect(staffIdsB).not.toContain(staffA1.id);
    });

    it('rejects a client-supplied school id in the query string', async () => {
      const token = await loginAs('admin-a@school.example');

      await request(app.getHttpServer())
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .query({ schoolId: schoolB.id })
        .expect(400);
    });
  });

  describe('unexpected Prisma errors', () => {
    it('maps a unique-constraint race on staff create to a conflict', async () => {
      const prismaMock = {
        ...createIdentityMocks(() => users),
        ...createInMemoryStore(collections, relations),
      };
      prismaMock.staff.create.mockRejectedValueOnce(prismaError('P2002'));

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
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({ staffNumber: 'STF001', firstName: 'John', lastName: 'Okello' })
        .expect(409);

      expect(response.body.message).toBe(
        'A staff member with this staff number already exists in this school.',
      );

      await raceApp.close();
    });
  });
});