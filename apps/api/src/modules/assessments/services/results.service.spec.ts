import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma.service';
import { ResultCalculatorService } from './result-calculator.service';
import { ResultsService } from './results.service';

describe('ResultsService', () => {
  let service: ResultsService;
  let prisma: {
    assessment: { findFirst: jest.Mock; findMany: jest.Mock };
    staff: { findFirst: jest.Mock };
    teachingAssignment: { findFirst: jest.Mock };
    learnerResult: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    resultAmendment: { create: jest.Mock };
  };
  let calculator: { calculate: jest.Mock; buildResult: jest.Mock };

  const school = 'school-a';
  const resultId = 'result-a';
  const assessmentId = 'assessment-a';

  const user = {
    id: 'user-admin',
    email: 'admin@school.test',
    fullName: 'Admin',
    activeSchoolId: school,
    roleNames: ['SCHOOL_ADMIN'],
    permissionKeys: ['results.approve'],
  };

  beforeEach(async () => {
    prisma = {
      assessment: { findFirst: jest.fn(), findMany: jest.fn() },
      staff: { findFirst: jest.fn() },
      teachingAssignment: { findFirst: jest.fn() },
      learnerResult: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      resultAmendment: { create: jest.fn() },
    };

    calculator = {
      calculate: jest.fn(),
      buildResult: jest.fn(async (result: Record<string, unknown>) => ({
        id: result.id,
        finalScore: result.finalScore,
        grade: result.grade,
        descriptor: result.descriptor,
        achievementLevel: result.achievementLevel,
        status: result.status,
        calculatedAt: result.calculatedAt ?? null,
        amendedAt: result.amendedAt ?? null,
        assessmentId: result.assessmentId,
        enrollmentId: result.enrollmentId,
        subjectId: result.subjectId,
        schoolId: result.schoolId,
        academicYearId: result.academicYearId,
        termId: result.termId,
        schemeVersionId: result.schemeVersionId,
        gradingSchemeVersionId: result.gradingSchemeVersionId,
        createdAt: result.createdAt ?? new Date(),
        updatedAt: result.updatedAt ?? new Date(),
        amendments: [],
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ResultCalculatorService, useValue: calculator },
      ],
    }).compile();

    service = module.get(ResultsService);
  });

  function resultRow(status: string, extra: Record<string, unknown> = {}) {
    return {
      id: resultId,
      finalScore: 79.28,
      grade: 'B',
      descriptor: 'Very Good',
      achievementLevel: null,
      status,
      calculatedAt: new Date(),
      amendedAt: null,
      assessmentId,
      enrollmentId: 'enrollment-a',
      subjectId: 'subject-a',
      schoolId: school,
      academicYearId: 'year-a',
      termId: null,
      schemeVersionId: null,
      gradingSchemeVersionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...extra,
    };
  }

  it('submits a draft result', async () => {
    prisma.learnerResult.findMany.mockResolvedValue([resultRow('DRAFT')]);
    prisma.assessment.findMany.mockResolvedValue([
      { id: assessmentId, schoolId: school, academicYearId: 'year-a', subjectId: 'subject-a', academicClassId: 'class-a', streamId: null },
    ]);
    prisma.learnerResult.update.mockImplementation(async (args: { where: { id: string }; data: Record<string, unknown> }) =>
      resultRow('SUBMITTED', { id: args.where.id }),
    );

    const results = await service.submit(school, user, { resultIds: [resultId] });

    expect(results[0].status).toBe('SUBMITTED');
  });

  it('rejects submitting a result that is already approved', async () => {
    prisma.learnerResult.findMany.mockResolvedValue([resultRow('APPROVED')]);
    prisma.assessment.findMany.mockResolvedValue([
      { id: assessmentId, schoolId: school, academicYearId: 'year-a', subjectId: 'subject-a', academicClassId: 'class-a', streamId: null },
    ]);

    await expect(
      service.submit(school, user, { resultIds: [resultId] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approves a submitted result', async () => {
    prisma.learnerResult.findMany.mockResolvedValue([resultRow('SUBMITTED')]);
    prisma.learnerResult.update.mockImplementation(async (args: { where: { id: string }; data: Record<string, unknown> }) =>
      resultRow('APPROVED', { id: args.where.id }),
    );

    const results = await service.approve(school, { resultIds: [resultId] });

    expect(results[0].status).toBe('APPROVED');
  });

  it('locks an approved result', async () => {
    prisma.learnerResult.findMany.mockResolvedValue([resultRow('APPROVED')]);
    prisma.learnerResult.update.mockImplementation(async (args: { where: { id: string }; data: Record<string, unknown> }) =>
      resultRow('LOCKED', { id: args.where.id }),
    );

    const results = await service.lock(school, { resultIds: [resultId] });

    expect(results[0].status).toBe('LOCKED');
  });

  it('amends a finalized result and records the history', async () => {
    prisma.learnerResult.findFirst.mockResolvedValue(resultRow('APPROVED'));
    prisma.resultAmendment.create.mockResolvedValue({ id: 'amendment-a' });
    prisma.learnerResult.update.mockImplementation(async (args: { where: { id: string }; data: Record<string, unknown> }) =>
      resultRow('AMENDED', { id: args.where.id, ...args.data }),
    );

    const result = await service.amend(school, user, {
      resultId,
      finalScore: 82,
      grade: 'A',
      reason: 'Original score entry error.',
    });

    expect(result.status).toBe('AMENDED');
    expect(result.finalScore).toBe(82);
    expect(prisma.resultAmendment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousFinalScore: 79.28,
          previousGrade: 'B',
          newFinalScore: 82,
          newGrade: 'A',
          reason: 'Original score entry error.',
          amendedById: user.id,
        }),
      }),
    );
  });

  it('rejects amending a draft result', async () => {
    prisma.learnerResult.findFirst.mockResolvedValue(resultRow('DRAFT'));

    await expect(
      service.amend(school, user, { resultId, finalScore: 82, reason: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects amending when no value changed', async () => {
    prisma.learnerResult.findFirst.mockResolvedValue(resultRow('APPROVED'));

    await expect(
      service.amend(school, user, {
        resultId,
        finalScore: 79.28,
        grade: 'B',
        reason: 'No real change',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when a result does not belong to the school', async () => {
    prisma.learnerResult.findMany.mockResolvedValue([]);

    await expect(
      service.submit(school, user, { resultIds: [resultId] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates generation to the calculator', async () => {
    prisma.assessment.findFirst.mockResolvedValue({
      id: assessmentId,
      schoolId: school,
      academicYearId: 'year-a',
      subjectId: 'subject-a',
      academicClassId: 'class-a',
      streamId: null,
    });
    calculator.calculate.mockResolvedValue([]);

    const results = await service.generate(school, user, assessmentId);

    expect(calculator.calculate).toHaveBeenCalledWith(school, assessmentId);
    expect(results).toEqual([]);
  });
});