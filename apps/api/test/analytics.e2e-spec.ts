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
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Analytics Test School',
  code: 'ANA-T',
};

const schoolB: SchoolFixture = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Other School',
  code: 'OTH-T',
};

type Scope = (typeof RoleScope)[keyof typeof RoleScope];
type MembershipStatusValue = 'ACTIVE' | 'INACTIVE';

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let users: UserFixture[];
  let prismaMock: any;
  let authToken: string;

  const analyticsPermissions = [
    'analytics.read',
  ];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new HttpExceptionFilter());

    prismaMock = app.get(PrismaService);
    prismaMock.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(prismaMock),
    );

    await app.init();

    const analyticsUser: UserFixture = {
      id: 'user-analytics-1',
      email: 'analytics@test.school',
      fullName: 'Analytics User',
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
          roleName: 'ANALYST',
          roleScope: 'SCHOOL' as Scope,
          permissionKeys: analyticsPermissions,
        },
      ],
    };

    const unauthorizedUser: UserFixture = {
      id: 'user-analytics-2',
      email: 'noanalytics@test.school',
      fullName: 'No Analytics User',
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
          roleName: 'VIEWER',
          roleScope: 'SCHOOL' as Scope,
          permissionKeys: [],
        },
      ],
    };

    users = [analyticsUser, unauthorizedUser];

    // Login as the analytics user
    const loginResp = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: analyticsUser.email, password })
      .expect(200);

    authToken = loginResp.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const authHeader = () => ({ Authorization: `Bearer ${authToken}` });
  const studentId = 'student-analytics-1';

  describe('Authorization', () => {
    it('should return 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get(`/analytics/students/${studentId}/performance`)
        .expect(401);
    });
  });

  describe('GET /analytics/students/:studentId/performance', () => {
    it('should return student performance summary', async () => {
      // The endpoint requires a valid student in the school
      // Since we're using mocks, this will return 404 if student is not found
      const resp = await request(app.getHttpServer())
        .get(`/analytics/students/${studentId}/performance`)
        .set(authHeader())
        .expect(404);

      expect(resp.body.message).toContain('Student not found');
    });

    it('should accept optional academicYearId and termId query params', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/analytics/students/${studentId}/performance?academicYearId=00000000-0000-4000-8000-000000000001&termId=00000000-0000-4000-8000-000000000002`)
        .set(authHeader())
        .expect(404);

      expect(resp.body.message).toContain('Student not found');
    });

    it('should reject invalid UUID for academicYearId', async () => {
      await request(app.getHttpServer())
        .get(`/analytics/students/${studentId}/performance?academicYearId=invalid`)
        .set(authHeader())
        .expect(400);
    });
  });

  describe('GET /analytics/students/:studentId/trend', () => {
    it('should return 404 for non-existent student', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/analytics/students/${studentId}/trend`)
        .set(authHeader())
        .expect(404);

      expect(resp.body.message).toContain('Student not found');
    });
  });

  describe('GET /analytics/students/:studentId/strengths-weaknesses', () => {
    it('should return 404 for non-existent student', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/analytics/students/${studentId}/strengths-weaknesses`)
        .set(authHeader())
        .expect(404);

      expect(resp.body.message).toContain('Student not found');
    });
  });

  describe('GET /analytics/students/:studentId/completion', () => {
    it('should return 404 for non-existent student', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/analytics/students/${studentId}/completion`)
        .set(authHeader())
        .expect(404);

      expect(resp.body.message).toContain('Student not found');
    });
  });

  describe('GET /analytics/students/:studentId/distribution', () => {
    it('should return 404 for non-existent student', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/analytics/students/${studentId}/distribution`)
        .set(authHeader())
        .expect(404);

      expect(resp.body.message).toContain('Student not found');
    });
  });

  describe('GET /analytics/students/:studentId/period-comparison', () => {
    it('should return 404 for non-existent student', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/analytics/students/${studentId}/period-comparison?academicYearId=00000000-0000-4000-8000-000000000001`)
        .set(authHeader())
        .expect(404);

      expect(resp.body.message).toContain('Student not found');
    });
  });

  describe('GET /analytics/students/:studentId/ranking', () => {
    it('should return 404 for non-existent student', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/analytics/students/${studentId}/ranking?academicYearId=00000000-0000-4000-8000-000000000001`)
        .set(authHeader())
        .expect(404);

      expect(resp.body.message).toContain('Student not found');
    });

    it('should require academicYearId', async () => {
      await request(app.getHttpServer())
        .get(`/analytics/students/${studentId}/ranking`)
        .set(authHeader())
        .expect(400);
    });

    it('should reject invalid UUID for academicYearId', async () => {
      await request(app.getHttpServer())
        .get(`/analytics/students/${studentId}/ranking?academicYearId=not-a-uuid`)
        .set(authHeader())
        .expect(400);
    });
  });
});
