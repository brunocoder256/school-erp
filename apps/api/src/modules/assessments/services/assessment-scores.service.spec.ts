import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma.service';
import { AssessmentScoresService } from './assessment-scores.service';

describe('AssessmentScoresService', () => {
  let service: AssessmentScoresService;
  let prisma: {
    assessment: { findFirst: jest.Mock };
    staff: { findFirst: jest.Mock };
    teachingAssignment: { findFirst: jest.Mock };
    assessmentComponent: { findMany: jest.Mock };
    enrollment: { findMany: jest.Mock };
    assessmentScore: { upsert: jest.Mock; findMany: jest.Mock };
  };

  const school = 'school-a';
  const year = 'year-a';
  const assessmentId = 'assessment-a';
  const componentId = 'component-a';
  const enrollmentId = 'enrollment-a';

  const assessment = {
    id: assessmentId,
    schoolId: school,
    academicYearId: year,
    subjectId: 'subject-a',
    academicClassId: 'class-a',
    streamId: null,
  };

  const adminUser = {
    id: 'user-admin',
    email: 'admin@school.test',
    fullName: 'Admin',
    activeSchoolId: school,
    roleNames: ['SCHOOL_ADMIN'],
    permissionKeys: ['results.approve'],
  };

  const teacherUser = {
    id: 'user-teacher',
    email: 'teacher@school.test',
    fullName: 'Teacher',
    activeSchoolId: school,
    roleNames: ['TEACHER'],
    permissionKeys: ['assessment_scores.update'],
  };

  beforeEach(async () => {
    prisma = {
      assessment: { findFirst: jest.fn() },
      staff: { findFirst: jest.fn() },
      teachingAssignment: { findFirst: jest.fn() },
      assessmentComponent: { findMany: jest.fn() },
      enrollment: { findMany: jest.fn() },
      assessmentScore: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentScoresService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AssessmentScoresService);
  });

  it('records a present score through upsert', async () => {
    prisma.assessment.findFirst.mockResolvedValue(assessment);
    prisma.assessmentComponent.findMany.mockResolvedValue([
      { id: componentId, name: 'Exam', maxScore: 100 },
    ]);
    prisma.enrollment.findMany.mockResolvedValue([{ id: enrollmentId }]);
    prisma.assessmentScore.upsert.mockImplementation(async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => ({
      id: 'score-a',
      assessmentId,
      componentId,
      enrollmentId,
      score: args.create.score ?? args.update.score,
      status: args.create.status ?? args.update.status,
      comment: null,
      recordedById: adminUser.id,
      recordedAt: new Date(),
    }));

    const result = await service.setScores(school, adminUser, assessmentId, {
      entries: [{ enrollmentId, componentId, score: 78.8, status: 'PRESENT' }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(78.8);
    expect(prisma.assessmentScore.upsert).toHaveBeenCalled();
  });

  it('allows an admin to record without a teaching assignment', async () => {
    prisma.assessment.findFirst.mockResolvedValue(assessment);
    prisma.assessmentComponent.findMany.mockResolvedValue([
      { id: componentId, name: 'Exam', maxScore: 100 },
    ]);
    prisma.enrollment.findMany.mockResolvedValue([{ id: enrollmentId }]);
    prisma.assessmentScore.upsert.mockResolvedValue({
      id: 'score-a',
      assessmentId,
      componentId,
      enrollmentId,
      score: 50,
      status: 'PRESENT',
      comment: null,
      recordedById: adminUser.id,
      recordedAt: new Date(),
    });

    await expect(
      service.setScores(school, adminUser, assessmentId, {
        entries: [{ enrollmentId, componentId, score: 50, status: 'PRESENT' }],
      }),
    ).resolves.toHaveLength(1);

    expect(prisma.staff.findFirst).not.toHaveBeenCalled();
  });

  it('forbids a teacher with no matching assignment', async () => {
    prisma.assessment.findFirst.mockResolvedValue(assessment);
    prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
    prisma.teachingAssignment.findFirst.mockResolvedValue(null);

    await expect(
      service.setScores(school, teacherUser, assessmentId, {
        entries: [{ enrollmentId, componentId, score: 50, status: 'PRESENT' }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a teacher with a matching active assignment', async () => {
    prisma.assessment.findFirst.mockResolvedValue(assessment);
    prisma.staff.findFirst.mockResolvedValue({ id: 'staff-a' });
    prisma.teachingAssignment.findFirst.mockResolvedValue({ id: 'ta-a' });
    prisma.assessmentComponent.findMany.mockResolvedValue([
      { id: componentId, name: 'Exam', maxScore: 100 },
    ]);
    prisma.enrollment.findMany.mockResolvedValue([{ id: enrollmentId }]);
    prisma.assessmentScore.upsert.mockResolvedValue({
      id: 'score-a',
      assessmentId,
      componentId,
      enrollmentId,
      score: 50,
      status: 'PRESENT',
      comment: null,
      recordedById: teacherUser.id,
      recordedAt: new Date(),
    });

    await expect(
      service.setScores(school, teacherUser, assessmentId, {
        entries: [{ enrollmentId, componentId, score: 50, status: 'PRESENT' }],
      }),
    ).resolves.toHaveLength(1);
  });

  it('rejects a present entry without a score', async () => {
    prisma.assessment.findFirst.mockResolvedValue(assessment);
    prisma.assessmentComponent.findMany.mockResolvedValue([
      { id: componentId, name: 'Exam', maxScore: 100 },
    ]);
    prisma.enrollment.findMany.mockResolvedValue([{ id: enrollmentId }]);

    await expect(
      service.setScores(school, adminUser, assessmentId, {
        entries: [{ enrollmentId, componentId, status: 'PRESENT' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a score above the component maximum', async () => {
    prisma.assessment.findFirst.mockResolvedValue(assessment);
    prisma.assessmentComponent.findMany.mockResolvedValue([
      { id: componentId, name: 'Exam', maxScore: 100 },
    ]);
    prisma.enrollment.findMany.mockResolvedValue([{ id: enrollmentId }]);

    await expect(
      service.setScores(school, adminUser, assessmentId, {
        entries: [{ enrollmentId, componentId, score: 120, status: 'PRESENT' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an enrollment outside the assessment context', async () => {
    prisma.assessment.findFirst.mockResolvedValue(assessment);
    prisma.assessmentComponent.findMany.mockResolvedValue([
      { id: componentId, name: 'Exam', maxScore: 100 },
    ]);
    prisma.enrollment.findMany.mockResolvedValue([{ id: 'other-enrollment' }]);

    await expect(
      service.setScores(school, adminUser, assessmentId, {
        entries: [{ enrollmentId, componentId, score: 50, status: 'PRESENT' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when the assessment does not belong to the school', async () => {
    prisma.assessment.findFirst.mockResolvedValue(null);

    await expect(
      service.setScores(school, adminUser, assessmentId, {
        entries: [{ enrollmentId, componentId, score: 50, status: 'PRESENT' }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists the scores of an assessment', async () => {
    prisma.assessment.findFirst.mockResolvedValue({ id: assessmentId });
    prisma.assessmentScore.findMany.mockResolvedValue([
      { id: 'score-a', assessmentId, componentId, enrollmentId, score: 78.8, status: 'PRESENT', comment: null, recordedById: null, recordedAt: new Date() },
    ]);

    const results = await service.listScores(school, assessmentId);

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(78.8);
  });
});