import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import request from 'supertest';
import { createIdentityMocks, SchoolFixture, UserFixture } from './helpers/in-memory-prisma';
import { RoleScope, UserStatus } from '../generated/prisma/enums';

const password = 'SecurePass123!';

const schoolA: SchoolFixture = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Mukono High School',
  code: 'MUK-H',
};

const yearA1 = {
  id: '54000000-0000-4000-8000-000000000001',
  name: 'Academic Year 2026',
  code: 'AY2026',
  startDate: '2026-02-01',
  endDate: '2026-11-30',
  isActive: true,
  schoolId: schoolA.id,
};

describe('Assessments (e2e)', () => {
  let app: INestApplication;
  let users: UserFixture[];
  let prismaMock: any;
  let authHeaders: Record<string, string>;

  const schoolAdminKeys = [
    'assessment_schemes.read',
    'assessment_schemes.create',
    'assessment_schemes.update',
    'grading_schemes.read',
    'grading_schemes.create',
    'grading_schemes.update',
    'ranking_policies.read',
    'ranking_policies.create',
    'ranking_policies.update',
    'assessments.read',
    'assessments.create',
    'assessments.update',
    'assessment_scores.read',
    'assessment_scores.update',
    'results.read',
    'results.create',
    'results.update',
    'results.approve',
    'results.lock',
    'results.amend',
    'rankings.read',
  ];

  const teacherKeys = [
    'assessment_schemes.read',
    'grading_schemes.read',
    'ranking_policies.read',
    'assessments.read',
    'assessments.create',
    'assessments.update',
    'assessment_scores.read',
    'assessment_scores.update',
    'results.read',
    'results.create',
    'rankings.read',
  ];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new HttpExceptionFilter());

    prismaMock = app.get(PrismaService);

    // Override $transaction to use the merged mock (critical for E2E)
    prismaMock.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(prismaMock),
    );

    await app.init();

    // Seed identity users with roles/permissions
    const schoolAdminUser: UserFixture = {
      id: 'user-admin-1',
      email: 'admin@mukono.high',
      fullName: 'Admin User',
      passwordHash: password,
      status: UserStatus.ACTIVE,
      memberships: [
        {
          schoolId: schoolA.id,
          status: 'ACTIVE' as MembershipStatusValue,
          joinedAt: new Date('2026-01-15'),
          school: schoolA,
        },
      ],
      userRoles: [
        {
          schoolId: schoolA.id,
          roleName: 'SCHOOL_ADMIN',
          roleScope: 'SCHOOL' as Scope,
          permissionKeys: schoolAdminKeys,
        },
      ],
    };

    const teacherUser: UserFixture = {
      id: 'user-teacher-1',
      email: 'teacher@mukono.high',
      fullName: 'Teacher User',
      passwordHash: password,
      status: UserStatus.ACTIVE,
      memberships: [
        {
          schoolId: schoolA.id,
          status: 'ACTIVE' as MembershipStatusValue,
          joinedAt: new Date('2026-01-15'),
          school: schoolA,
        },
      ],
      userRoles: [
        {
          schoolId: schoolA.id,
          roleName: 'TEACHER',
          roleScope: 'SCHOOL' as Scope,
          permissionKeys: teacherKeys,
        },
      ],
    };

    users = [schoolAdminUser, teacherUser];

    // Login as each user via supertest
    for (const user of users) {
      const loginResp = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password })
        .expect(200);

      // Store auth header for later requests
      // (In a real suite we'd persist this; here we just verify login works)
      console.log(`User ${user.email} logged in`);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Assessment CRUD', () => {
    it('admin can create an assessment', async () => {
      // Minimal assessment create - schema and version already seeded by seed script
      const resp = await request(app.getHttpServer())
        .post('/assessments')
        .set('Authorization', `Bearer ${password}`)
        .send({
          name: 'S5 Mathematics Term 1 Examination',
          type: 'EXAMINATION',
          academicYearId: '54000000-0000-4000-8000-000000000001',
          subjectId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
          academicClassId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
        })
        .expect(201);

      expect(resp.body.name).toBe('S5 Mathematics Term 1 Examination');
      expect(resp.body.status).toBe('DRAFT');
    });

    it('teacher cannot create assessment without matching assignment', async () => {
      // Teacher trying to create assessment without teaching assignment should be forbidden
      const resp = await request(app.getHttpServer())
        .post('/assessments')
        .set('Authorization', `Bearer ${password}`)
        .send({
          name: 'S5 Mathematics Term 1 Examination',
          type: 'EXAMINATION',
          academicYearId: '54000000-0000-4000-8000-000000000001',
          subjectId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
          academicClassId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
        })
        .expect(403);

      expect(resp.body.message).toContain('not assigned');
    });
  });

  describe('Assessment Scores', () => {
    it('admin can record a present score', async () => {
      // First create an assessment and get its ID
      const assessmentResp = await request(app.getHttpServer())
        .post('/assessments')
        .set('Authorization', `Bearer ${password}`)
        .send({
          name: 'S5 Mathematics Term 1',
          type: 'EXAMINATION',
          academicYearId: '54000000-0000-4000-8000-000000000001',
          subjectId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
          academicClassId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
        });

      const assessmentId = assessmentResp.body.id;

      // Record score for enrollment
      const scoreResp = await request(app.getHttpServer())
        .put(`/assessments/${assessmentId}/scores`)
        .set('Authorization', `Bearer ${password}`)
        .send({
          entries: [
            {
              enrollmentId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c',
              componentId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d',
              score: 78.8,
              status: 'PRESENT',
            },
          ],
        })
        .expect(200);

      expect(scoreResp.body).toHaveLength(1);
      expect(scoreResp.body[0].score).toBe(78.8);
    });

    it('rejects present without score', async () => {
      const assessmentResp = await request(app.getHttpServer())
        .post('/assessments')
        .set('Authorization', `Bearer ${password}`)
        .send({
          name: 'S5 Mathematics Term 1',
          type: 'EXAMINATION',
          academicYearId: '54000000-0000-4000-8000-000000000001',
          subjectId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
          academicClassId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
        });

      const assessmentId = assessmentResp.body.id;

      await request(app.getHttpServer())
        .put(`/assessments/${assessmentId}/scores`)
        .set('Authorization', `Bearer ${password}`)
        .send({
          entries: [
            {
              enrollmentId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c',
              componentId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d',
              status: 'PRESENT',
            },
          ],
        })
        .expect(400);
    });
  });

  describe('Result Lifecycle', () => {
    it('admin can generate draft results', async () => {
      const assessmentResp = await request(app.getHttpServer())
        .post('/results/generate')
        .set('Authorization', `Bearer ${password}`)
        .query('assessmentId', '1');

      expect(assayResp.body).toBeInstanceOf(Array);
    });

    it('admin can submit draft results', async () => {
      const resp = await request(app.getHttpServer())
        .post('/results/submit')
        .set('Authorization', `Bearer ${password}`)
        .send({ resultIds: ['1'] });

      expect(resp.body[0].status).toBe('SUBMITTED');
    });

    it('admin can approve submitted results', async () => {
      const resp = await request(app.getHttpServer())
        .post('/results/approve')
        .set('Authorization', `Bearer ${password}`)
        .send({ resultIds: ['1'] });

      expect(resp.body[0].status).toBe('APPROVED');
    });

    it('admin can lock approved results', async () => {
      const resp = await request(app.getHttpServer())
        .post('/results/lock')
        .set('Authorization', `Bearer ${password}`)
        .send({ resultIds: ['1'] });

      expect(resp.body[0].status).toBe('LOCKED');
    });

    it('admin can amend a finalized result', async () => {
      const resp = await request(app.getHttpServer())
        .post('/results/amend')
        .set('Authorization', `Bearer ${password}`)
        .send({
          resultId: '1',
          finalScore: 85,
          grade: 'A',
          reason: 'Score recalculation.',
        });

      expect(resp.body.status).toBe('AMENDED');
      expect(resp.body.finalScore).toBe(85);
    });

    it('rejects amending a draft result', async () => {
      await request(app.getHttpServer())
        .post('/results/amend')
        .set('Authorization', `Bearer ${password}`)
        .send({
          resultId: '1',
          finalScore: 85,
          reason: 'x',
        })
        .expect(400);
    });
  });

  describe('Rankings', () => {
    it('admin can compute rankings', async () => {
      const resp = await request(app.getHttpServer())
        .get('/rankings')
        .query({ policyId: '1', subjectId: '1' })
        .set('Authorization', `Bearer ${password}`);

      expect(resp.body).toBeInstanceOf(Array);
    });
  });
});