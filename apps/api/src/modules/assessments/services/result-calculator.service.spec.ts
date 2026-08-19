import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma.service';
import { ResultCalculatorService } from './result-calculator.service';

describe('ResultCalculatorService', () => {
  let service: ResultCalculatorService;
  let prisma: {
    assessment: { findFirst: jest.Mock };
    assessmentComponent: { findMany: jest.Mock };
    schemeComponentDefinition: { findMany: jest.Mock };
    assessmentScore: { findMany: jest.Mock };
    learnerResult: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    assessmentSchemeVersion: { findFirst: jest.Mock };
    gradingBand: { findMany: jest.Mock };
    resultAmendment: { findMany: jest.Mock };
  };

  const school = 'school-a';
  const year = 'year-a';
  const term = 'term-a';
  const subject = 'subject-a';
  const assessmentId = 'assessment-a';
  const enrollment = 'enrollment-a';

  const bands = [
    { id: 'b1', minScore: 80, maxScore: 100, grade: 'A', descriptor: 'Excellent', achievementLevel: 'Outstanding', displayOrder: 1, versionId: 'gv1' },
    { id: 'b2', minScore: 70, maxScore: 79.99, grade: 'B', descriptor: 'Very Good', achievementLevel: 'Above expectation', displayOrder: 2, versionId: 'gv1' },
  ];

  beforeEach(async () => {
    prisma = {
      assessment: { findFirst: jest.fn() },
      assessmentComponent: { findMany: jest.fn() },
      schemeComponentDefinition: { findMany: jest.fn() },
      assessmentScore: { findMany: jest.fn() },
      learnerResult: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      assessmentSchemeVersion: { findFirst: jest.fn() },
      gradingBand: { findMany: jest.fn() },
      resultAmendment: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultCalculatorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ResultCalculatorService);
  });

  function baseAssessment() {
    return {
      id: assessmentId,
      name: 'S5 Mathematics Term 1',
      code: null,
      type: 'EXAMINATION',
      date: null,
      status: 'DRAFT',
      schoolId: school,
      academicYearId: year,
      termId: term,
      subjectId: subject,
      academicClassId: 'class-a',
      streamId: null,
      teachingGroupId: null,
      schemeVersionId: 'sv1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('computes weighted final scores and grades from scheme definitions', async () => {
    prisma.assessment.findFirst.mockResolvedValue(baseAssessment());
    prisma.assessmentComponent.findMany.mockResolvedValue([
      { id: 'ca', name: 'Continuous Assessment', code: 'CA', displayOrder: 1, weight: 40, maxScore: 40, schemeComponentDefinitionId: 'def-ca', sourceAssessmentId: null, assessmentId },
      { id: 'exam', name: 'Term End Examination', code: 'EXAM', displayOrder: 2, weight: 60, maxScore: 100, schemeComponentDefinitionId: 'def-exam', sourceAssessmentId: null, assessmentId },
    ]);
    prisma.schemeComponentDefinition.findMany.mockResolvedValue([
      { id: 'def-ca', name: 'CA', code: 'CA', weight: 40, maxScore: 40 },
      { id: 'def-exam', name: 'EXAM', code: 'EXAM', weight: 60, maxScore: 100 },
    ]);
    prisma.assessmentScore.findMany.mockResolvedValue([
      { id: 's1', assessmentId, componentId: 'ca', enrollmentId: enrollment, score: 32, status: 'PRESENT' },
      { id: 's2', assessmentId, componentId: 'exam', enrollmentId: enrollment, score: 78.8, status: 'PRESENT' },
    ]);
    prisma.learnerResult.findMany.mockResolvedValue([]);
    prisma.assessmentSchemeVersion.findFirst.mockResolvedValue({ gradingSchemeVersionId: 'gv1' });
    prisma.gradingBand.findMany.mockResolvedValue(bands);
    prisma.learnerResult.findFirst.mockResolvedValue(null);
    prisma.learnerResult.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: 'r1',
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const results = await service.calculate(school, assessmentId);

    expect(results).toHaveLength(1);
    expect(results[0].finalScore).toBe(79.28);
    expect(results[0].grade).toBe('B');
    expect(results[0].descriptor).toBe('Very Good');
    expect(results[0].status).toBe('DRAFT');
  });

  it('excludes absent learners from the calculation', async () => {
    prisma.assessment.findFirst.mockResolvedValue(baseAssessment());
    prisma.assessmentComponent.findMany.mockResolvedValue([
      { id: 'exam', name: 'Term End Examination', code: 'EXAM', displayOrder: 1, weight: 100, maxScore: 100, schemeComponentDefinitionId: 'def-exam', sourceAssessmentId: null, assessmentId },
    ]);
    prisma.assessmentScore.findMany.mockResolvedValue([
      { id: 's1', assessmentId, componentId: 'exam', enrollmentId: enrollment, score: null, status: 'ABSENT' },
    ]);
    prisma.schemeComponentDefinition.findMany.mockResolvedValue([]);
    prisma.learnerResult.findMany.mockResolvedValue([]);
    prisma.assessmentSchemeVersion.findFirst.mockResolvedValue({ gradingSchemeVersionId: 'gv1' });
    prisma.gradingBand.findMany.mockResolvedValue(bands);

    const results = await service.calculate(school, assessmentId);

    expect(results).toHaveLength(0);
    expect(prisma.learnerResult.create).not.toHaveBeenCalled();
  });

  it('derives source-component scores from the source assessment result', async () => {
    prisma.assessment.findFirst.mockResolvedValue(baseAssessment());
    prisma.assessmentComponent.findMany.mockResolvedValue([
      { id: 'portfolio', name: 'Portfolio', code: 'PORT', displayOrder: 1, weight: 100, maxScore: 100, schemeComponentDefinitionId: 'def-port', sourceAssessmentId: 'source-a', assessmentId },
    ]);
    prisma.schemeComponentDefinition.findMany.mockResolvedValue([
      { id: 'def-port', name: 'Portfolio', code: 'PORT', weight: 100, maxScore: 100 },
    ]);
    prisma.assessmentScore.findMany.mockResolvedValue([]);
    prisma.learnerResult.findMany.mockResolvedValue([
      { id: 'src-r', assessmentId: 'source-a', enrollmentId: enrollment, finalScore: 85 },
    ]);
    prisma.assessmentSchemeVersion.findFirst.mockResolvedValue({ gradingSchemeVersionId: 'gv1' });
    prisma.gradingBand.findMany.mockResolvedValue(bands);
    prisma.learnerResult.findFirst.mockResolvedValue(null);
    prisma.learnerResult.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: 'r1',
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const results = await service.calculate(school, assessmentId);

    expect(results).toHaveLength(1);
    expect(results[0].finalScore).toBe(85);
    expect(results[0].grade).toBe('A');
  });

  it('does not recalculate a finalized result', async () => {
    prisma.assessment.findFirst.mockResolvedValue(baseAssessment());
    prisma.assessmentComponent.findMany.mockResolvedValue([
      { id: 'exam', name: 'Term End Examination', code: 'EXAM', displayOrder: 1, weight: 100, maxScore: 100, schemeComponentDefinitionId: 'def-exam', sourceAssessmentId: null, assessmentId },
    ]);
    prisma.schemeComponentDefinition.findMany.mockResolvedValue([
      { id: 'def-exam', name: 'EXAM', code: 'EXAM', weight: 100, maxScore: 100 },
    ]);
    prisma.assessmentScore.findMany.mockResolvedValue([
      { id: 's1', assessmentId, componentId: 'exam', enrollmentId: enrollment, score: 90, status: 'PRESENT' },
    ]);
    prisma.learnerResult.findMany.mockResolvedValue([]);
    prisma.assessmentSchemeVersion.findFirst.mockResolvedValue({ gradingSchemeVersionId: 'gv1' });
    prisma.gradingBand.findMany.mockResolvedValue(bands);
    prisma.learnerResult.findFirst.mockResolvedValue({ id: 'r1', status: 'APPROVED' });

    const results = await service.calculate(school, assessmentId);

    expect(results).toHaveLength(0);
    expect(prisma.learnerResult.update).not.toHaveBeenCalled();
    expect(prisma.learnerResult.create).not.toHaveBeenCalled();
  });

  it('throws when the assessment does not belong to the school', async () => {
    prisma.assessment.findFirst.mockResolvedValue(null);

    await expect(service.calculate(school, assessmentId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});