import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: {
    student: { findFirst: jest.Mock };
    learnerResult: { findMany: jest.Mock };
    academicYear: { findFirst: jest.Mock; findMany: jest.Mock };
    term: { findMany: jest.Mock; findFirst: jest.Mock };
    assessment: { findMany: jest.Mock };
    enrollment: { findFirst: jest.Mock; findMany: jest.Mock };
    rankingPolicy: { findMany: jest.Mock };
    academicClass: { findFirst: jest.Mock; findMany: jest.Mock };
    subject: { findFirst: jest.Mock };
    stream: { findFirst: jest.Mock; findMany: jest.Mock };
  };

  const schoolId = 'school-a';
  const studentId = 'student-a';

  beforeEach(async () => {
    prisma = {
      student: { findFirst: jest.fn() },
      learnerResult: { findMany: jest.fn() },
      academicYear: { findFirst: jest.fn(), findMany: jest.fn() },
      term: { findMany: jest.fn(), findFirst: jest.fn() },
      assessment: { findMany: jest.fn() },
      enrollment: { findFirst: jest.fn(), findMany: jest.fn() },
      rankingPolicy: { findMany: jest.fn() },
      academicClass: { findFirst: jest.fn(), findMany: jest.fn() },
      subject: { findFirst: jest.fn() },
      stream: { findFirst: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('verifySchoolAccess', () => {
    it('should pass when schoolId matches', () => {
      expect(() => service.verifySchoolAccess(schoolId, schoolId)).not.toThrow();
    });

    it('should throw when schoolId mismatch', () => {
      expect(() => service.verifySchoolAccess(schoolId, 'other-school')).toThrow(BadRequestException);
    });
  });

  describe('studentPerformanceSummary', () => {
    it('should throw NotFoundException for non-existent student', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.studentPerformanceSummary(studentId, schoolId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should compute summary with numeric scores', async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'John',
        middleName: null,
        lastName: 'Doe',
        preferredName: 'Johnny',
        admissionNumber: 'ADM001',
      });

      prisma.learnerResult.findMany.mockResolvedValue([
        {
          subjectId: 'sub-1',
          finalScore: 85.5,
          grade: 'A',
          descriptor: 'Excellent',
          achievementLevel: ' proficiency',
          status: 'APPROVED',
          subject: { id: 'sub-1', name: 'Mathematics', code: 'MATH' },
        },
        {
          subjectId: 'sub-1',
          finalScore: 90.0,
          grade: 'A',
          descriptor: 'Excellent',
          achievementLevel: 'proficient',
          status: 'APPROVED',
          subject: { id: 'sub-1', name: 'Mathematics', code: 'MATH' },
        },
        {
          subjectId: 'sub-2',
          finalScore: null,
          grade: 'B',
          descriptor: 'Good',
          achievementLevel: '',
          status: 'APPROVED',
          subject: { id: 'sub-2', name: 'English', code: 'ENGL' },
        },
      ]);

      const result = await service.studentPerformanceSummary(studentId, schoolId);

      expect(result.studentName).toBe('Johnny');
      expect(result.admissionNumber).toBe('ADM001');
      expect(result.totalResults).toBe(3);
      expect(result.numericResultCount).toBe(2);
      expect(result.nonNumericResultCount).toBe(1);
      expect(result.overallAverageScore).toBe(87.75);
      expect(result.overallMinScore).toBe(85.5);
      expect(result.overallMaxScore).toBe(90);
      expect(result.overallGrade).toBe('A');
      expect(result.subjectPerformance).toHaveLength(2);
    });

    it('should handle all non-numeric results', async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'Jane',
        middleName: null,
        lastName: 'Smith',
        preferredName: null,
        admissionNumber: 'ADM002',
      });

      prisma.learnerResult.findMany.mockResolvedValue([
        {
          subjectId: 'sub-1',
          finalScore: null,
          grade: 'A',
          descriptor: 'Excellent',
          achievementLevel: 'proficient',
          status: 'APPROVED',
          subject: { id: 'sub-1', name: 'Mathematics', code: 'MATH' },
        },
        {
          subjectId: 'sub-2',
          finalScore: null,
          grade: 'B',
          descriptor: 'Good',
          achievementLevel: 'developing',
          status: 'APPROVED',
          subject: { id: 'sub-2', name: 'English', code: 'ENGL' },
        },
      ]);

      const result = await service.studentPerformanceSummary(studentId, schoolId);

      expect(result.totalResults).toBe(2);
      expect(result.numericResultCount).toBe(0);
      expect(result.nonNumericResultCount).toBe(2);
      expect(result.overallAverageScore).toBeNull();
      expect(result.studentName).toBe('Jane Smith');
    });

    it('should handle empty results', async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'Empty',
        middleName: null,
        lastName: 'Student',
        preferredName: null,
        admissionNumber: 'ADM003',
      });

      prisma.learnerResult.findMany.mockResolvedValue([]);

      const result = await service.studentPerformanceSummary(studentId, schoolId);

      expect(result.totalResults).toBe(0);
      expect(result.overallAverageScore).toBeNull();
      expect(result.subjectPerformance).toHaveLength(0);
    });

    it('should filter by academicYearId and termId', async () => {
      const academicYearId = 'year-1';
      const termId = 'term-1';

      prisma.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'Filtered',
        middleName: 'M',
        lastName: 'Student',
        preferredName: null,
        admissionNumber: 'ADM004',
      });

      prisma.learnerResult.findMany.mockResolvedValue([]);

      await service.studentPerformanceSummary(studentId, schoolId, academicYearId, termId);

      expect(prisma.learnerResult.findMany).toHaveBeenCalledWith({
        where: {
          schoolId,
          enrollment: { studentId },
          status: { in: ['APPROVED', 'LOCKED', 'AMENDED'] },
          academicYearId,
          termId,
        },
        include: {
          subject: { select: { id: true, name: true, code: true } },
        },
      });
    });
  });

  describe('studentPeriodComparison', () => {
    it('should throw NotFoundException for non-existent academic year', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentId });
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.studentPeriodComparison(studentId, schoolId, 'year-x'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should compute term-by-term averages', async () => {
      const academicYearId = 'year-1';

      prisma.student.findFirst.mockResolvedValue({ id: studentId });
      prisma.academicYear.findFirst.mockResolvedValue({
        id: academicYearId,
        name: '2024',
        terms: [{ id: 'term-1', name: 'Term 1' }, { id: 'term-2', name: 'Term 2' }],
      });

      // Term 1: scores 80, 90 → avg 85
      // Term 2: score 70 → avg 70
      // Year aggregate: all 3 → avg 80
      const mockResults = [
        { finalScore: 80 },
        { finalScore: 90 },
        { finalScore: 70 },
      ];

      prisma.learnerResult.findMany
        .mockResolvedValueOnce([mockResults[0], mockResults[1]])  // Term 1
        .mockResolvedValueOnce([mockResults[2]])                   // Term 2
        .mockResolvedValueOnce(mockResults);                     // Year aggregate

      const result = await service.studentPeriodComparison(studentId, schoolId, academicYearId);

      expect(result.comparisonPoints).toHaveLength(3);
      // First point is "All Terms" aggregate
      expect(result.comparisonPoints[0].termName).toBe('All Terms');
      expect(result.comparisonPoints[0].averageScore).toBe(80);
      expect(result.comparisonPoints[0].resultCount).toBe(3);

      // Term 1
      expect(result.comparisonPoints[1].termName).toBe('Term 1');
      expect(result.comparisonPoints[1].averageScore).toBe(85);
      expect(result.comparisonPoints[1].resultCount).toBe(2);

      // Term 2
      expect(result.comparisonPoints[2].termName).toBe('Term 2');
      expect(result.comparisonPoints[2].averageScore).toBe(70);
      expect(result.comparisonPoints[2].resultCount).toBe(1);
    });
  });

  describe('studentAcademicTrend', () => {
    it('should compute trend across multiple academic years', async () => {
      const academicYears = [
        { id: 'year-1', name: '2023' },
        { id: 'year-2', name: '2024' },
      ];

      prisma.student.findFirst.mockResolvedValue({ id: studentId });
      prisma.academicYear.findMany.mockResolvedValue(academicYears);
      prisma.term.findMany.mockResolvedValue([
        { id: 'term-1', name: 'Term 1', academicYear: { id: 'year-1', name: '2023' }, academicYearId: 'year-1' },
        { id: 'term-2', name: 'Term 2', academicYear: { id: 'year-1', name: '2023' }, academicYearId: 'year-1' },
        { id: 'term-3', name: 'Term 1', academicYear: { id: 'year-2', name: '2024' }, academicYearId: 'year-2' },
      ]);

      // Year 1 results: 80, 90 → avg 85
      // Year 1 Term 1: 80 → avg 80
      // Year 1 Term 2: 90 → avg 90
      // Year 2 results: 70 → avg 70
      // Year 2 Term 1: 70 → avg 70
      prisma.learnerResult.findMany
        .mockResolvedValueOnce([{ finalScore: 80, grade: 'A' }, { finalScore: 90, grade: 'B' }]) // Year 1 total
        .mockResolvedValueOnce([{ finalScore: 80, grade: 'A' }]) // Year 1 Term 1
        .mockResolvedValueOnce([{ finalScore: 90, grade: 'B' }]) // Year 1 Term 2
        .mockResolvedValueOnce([{ finalScore: 70, grade: 'C' }]) // Year 2 total
        .mockResolvedValueOnce([{ finalScore: 70, grade: 'C' }]); // Year 2 Term 1

      const result = await service.studentAcademicTrend(studentId, schoolId);

      expect(result.trendPoints).toHaveLength(5);
      expect(result.trendPoints[0].academicYearName).toBe('2023');
      expect(result.trendPoints[0].averageScore).toBe(85);
      expect(result.trendPoints[0].termId).toBeUndefined();
      expect(result.trendPoints[0].termName).toBeUndefined();

      expect(result.trendPoints[1].academicYearName).toBe('2023');
      expect(result.trendPoints[1].termName).toBe('Term 1');
      expect(result.trendPoints[1].averageScore).toBe(80);

      expect(result.trendPoints[2].academicYearName).toBe('2023');
      expect(result.trendPoints[2].termName).toBe('Term 2');
      expect(result.trendPoints[2].averageScore).toBe(90);

      expect(result.trendPoints[3].academicYearName).toBe('2024');
      expect(result.trendPoints[3].averageScore).toBe(70);

      expect(result.trendPoints[4].academicYearName).toBe('2024');
      expect(result.trendPoints[4].termName).toBe('Term 1');
      expect(result.trendPoints[4].averageScore).toBe(70);
    });

    it('should handle empty results across all years', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentId });
      prisma.academicYear.findMany.mockResolvedValue([{ id: 'year-1', name: '2023' }]);
      prisma.term.findMany.mockResolvedValue([]);
      prisma.learnerResult.findMany.mockResolvedValue([]);

      const result = await service.studentAcademicTrend(studentId, schoolId);

      expect(result.trendPoints).toHaveLength(1);
      expect(result.trendPoints[0].averageScore).toBeNull();
      expect(result.trendPoints[0].resultCount).toBe(0);
      expect(result.trendPoints[0].gradeDistribution).toEqual({});
    });
  });

  describe('studentStrengthsWeaknesses', () => {
    it('should identify strengths (above average) and weaknesses (below average)', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentId });

      prisma.learnerResult.findMany.mockResolvedValue([
        {
          subjectId: 'sub-1',
          finalScore: 90,
          grade: 'A',
          descriptor: 'Excellent',
          achievementLevel: 'proficient',
          status: 'APPROVED',
          subject: { id: 'sub-1', name: 'Math', code: 'M' },
        },
        {
          subjectId: 'sub-2',
          finalScore: 60,
          grade: 'C',
          descriptor: 'Needs Improvement',
          achievementLevel: 'developing',
          status: 'APPROVED',
          subject: { id: 'sub-2', name: 'Science', code: 'S' },
        },
        {
          subjectId: 'sub-3',
          finalScore: null,
          grade: null,
          descriptor: null,
          achievementLevel: null,
          status: 'APPROVED',
          subject: { id: 'sub-3', name: 'Art', code: 'A' },
        },
      ]);

      const result = await service.studentStrengthsWeaknesses(studentId, schoolId);

      // Overall average = (90 + 60) / 2 = 75
      // Math 90 > 75 → strength
      // Science 60 < 75 → weakness
      // Art has no score/grade → weakness
      expect(result.strengths).toHaveLength(1);
      expect(result.strengths[0].subjectName).toBe('Math');

      expect(result.weaknesses).toHaveLength(2);
      expect(result.weaknesses[0].subjectName).toBe('Science');
      expect(result.weaknesses[1].subjectName).toBe('Art');
    });

    it('should handle all subjects at the same level (no strengths/weaknesses from average difference)', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentId });

      prisma.learnerResult.findMany.mockResolvedValue([
        {
          subjectId: 'sub-1',
          finalScore: 80,
          grade: 'B',
          descriptor: 'Good',
          achievementLevel: 'proficient',
          status: 'APPROVED',
          subject: { id: 'sub-1', name: 'Math', code: 'M' },
        },
        {
          subjectId: 'sub-2',
          finalScore: 80,
          grade: 'B',
          descriptor: 'Good',
          achievementLevel: 'proficient',
          status: 'APPROVED',
          subject: { id: 'sub-2', name: 'Science', code: 'S' },
        },
      ]);

      const result = await service.studentStrengthsWeaknesses(studentId, schoolId);

      expect(result.strengths).toHaveLength(0);
      expect(result.weaknesses).toHaveLength(0);
    });
  });

  describe('studentResultCompletion', () => {
    it('should compute completion per subject', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentId });
      prisma.assessment.findMany.mockResolvedValue([
        { id: 'a1', subjectId: 'sub-1', subject: { name: 'Math', code: 'M' } },
        { id: 'a2', subjectId: 'sub-1', subject: { name: 'Math', code: 'M' } },
        { id: 'a3', subjectId: 'sub-2', subject: { name: 'Science', code: 'S' } },
      ]);
      prisma.learnerResult.findMany.mockResolvedValue([
        { assessmentId: 'a1' },
        { assessmentId: 'a2' },
      ]);

      const result = await service.studentResultCompletion(studentId, schoolId);

      expect(result.completion).toHaveLength(2);
      expect(result.completion[0].subjectName).toBe('Math');
      expect(result.completion[0].assessmentCount).toBe(2);
      expect(result.completion[0].resultCount).toBe(2);
      expect(result.completion[0].completionPercentage).toBe(100);

      expect(result.completion[1].subjectName).toBe('Science');
      expect(result.completion[1].assessmentCount).toBe(1);
      expect(result.completion[1].resultCount).toBe(0);
      expect(result.completion[1].completionPercentage).toBe(0);
      expect(result.completion[1].pendingAssessments).toBe(1);

      expect(result.overallCompletionPercentage).toBe(66.67);
    });
  });

  describe('studentDistributionAnalysis', () => {
    it('should compute score distribution with quartiles', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentId });
      prisma.learnerResult.findMany.mockResolvedValue([
        { finalScore: 50, grade: 'C', achievementLevel: 'developing' },
        { finalScore: 60, grade: 'C', achievementLevel: 'developing' },
        { finalScore: 70, grade: 'B', achievementLevel: 'proficient' },
        { finalScore: 80, grade: 'B', achievementLevel: 'proficient' },
        { finalScore: 90, grade: 'A', achievementLevel: 'proficient' },
        { finalScore: 100, grade: 'A', achievementLevel: 'proficient' },
      ]);

      const result = await service.studentDistributionAnalysis(studentId, schoolId);

      expect(result.scoreDistribution.minScore).toBe(50);
      expect(result.scoreDistribution.maxScore).toBe(100);
      expect(result.scoreDistribution.averageScore).toBe(75);
      expect(result.scoreDistribution.quartiles.q2).toBe(75); // median
      expect(result.gradeDistribution).toHaveLength(3);
      expect(result.achievementDistribution).toHaveLength(2);
    });

    it('should handle all non-numeric results', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentId });
      prisma.learnerResult.findMany.mockResolvedValue([
        { finalScore: null, grade: 'A', achievementLevel: 'proficient' },
        { finalScore: null, grade: 'B', achievementLevel: 'developing' },
      ]);

      const result = await service.studentDistributionAnalysis(studentId, schoolId);

      expect(result.scoreDistribution.minScore).toBeNull();
      expect(result.scoreDistribution.maxScore).toBeNull();
      expect(result.scoreDistribution.averageScore).toBeNull();
      expect(result.scoreDistribution.standardDeviation).toBeNull();
      expect(result.gradeDistribution).toHaveLength(2);
    });
  });

  describe('tenant isolation — schoolId on every LearnerResult query', () => {
    it('performance summary includes schoolId in the where clause', async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'Tenant',
        middleName: null,
        lastName: 'Test',
        preferredName: null,
        admissionNumber: 'TNT001',
      });
      prisma.learnerResult.findMany.mockResolvedValue([]);

      await service.studentPerformanceSummary(studentId, schoolId);

      const call = prisma.learnerResult.findMany.mock.calls[0][0];
      expect(call.where.schoolId).toBe(schoolId);
    });

    it('distribution analysis includes schoolId in the where clause', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentId });
      prisma.learnerResult.findMany.mockResolvedValue([]);

      await service.studentDistributionAnalysis(studentId, schoolId);

      const call = prisma.learnerResult.findMany.mock.calls[0][0];
      expect(call.where.schoolId).toBe(schoolId);
    });

    it('result completion includes schoolId in the where clause', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: studentId });
      prisma.assessment.findMany.mockResolvedValue([]);
      prisma.learnerResult.findMany.mockResolvedValue([]);

      await service.studentResultCompletion(studentId, schoolId);

      const call = prisma.learnerResult.findMany.mock.calls[0][0];
      expect(call.where.schoolId).toBe(schoolId);
    });
  });

  describe('changing subject enrollment', () => {
    it('handles results across different subjects when enrollment changes', async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'Changed',
        middleName: null,
        lastName: 'Subject',
        preferredName: null,
        admissionNumber: 'CHG001',
      });

      // Student was enrolled in Math but dropped it; picked up Physics instead
      prisma.learnerResult.findMany.mockResolvedValue([
        {
          subjectId: 'sub-math',
          finalScore: 70,
          grade: 'B',
          descriptor: 'Good',
          achievementLevel: 'proficient',
          status: 'APPROVED',
          subject: { id: 'sub-math', name: 'Mathematics', code: 'MATH' },
        },
        {
          subjectId: 'sub-phys',
          finalScore: 85,
          grade: 'A',
          descriptor: 'Excellent',
          achievementLevel: 'proficient',
          status: 'APPROVED',
          subject: { id: 'sub-phys', name: 'Physics', code: 'PHYS' },
        },
      ]);

      const result = await service.studentPerformanceSummary(studentId, schoolId);

      expect(result.subjectPerformance).toHaveLength(2);
      const math = result.subjectPerformance.find((s) => s.subjectCode === 'MATH');
      const phys = result.subjectPerformance.find((s) => s.subjectCode === 'PHYS');
      expect(math?.averageScore).toBe(70);
      expect(phys?.averageScore).toBe(85);
    });
  });

  describe('studentRankingDisplay', () => {
    const academicYearId = 'year-1';

    it('should throw NotFoundException for non-existent student', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.studentRankingDisplay(studentId, schoolId, academicYearId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent academic year', async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'Rank',
        middleName: null,
        lastName: 'Student',
        preferredName: null,
        admissionNumber: 'RNK001',
      });
      prisma.academicYear.findFirst.mockResolvedValue(null);

      await expect(
        service.studentRankingDisplay(studentId, schoolId, academicYearId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty rankings when no active policies exist', async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'Rank',
        middleName: null,
        lastName: 'Student',
        preferredName: null,
        admissionNumber: 'RNK001',
      });
      prisma.academicYear.findFirst.mockResolvedValue({ id: academicYearId, name: '2024' });
      prisma.rankingPolicy.findMany.mockResolvedValue([]);

      const result = await service.studentRankingDisplay(studentId, schoolId, academicYearId);

      expect(result.rankings).toHaveLength(0);
      expect(result.studentName).toBe('Rank Student');
    });

    it('should compute ranking using AVERAGE_SCORE method', async () => {
      const policyId = 'policy-1';
      const enrollmentId = 'enr-student';

      prisma.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'Rank',
        middleName: null,
        lastName: 'Student',
        preferredName: null,
        admissionNumber: 'RNK001',
      });
      prisma.academicYear.findFirst.mockResolvedValue({ id: academicYearId, name: '2024' });
      prisma.enrollment.findFirst.mockResolvedValue({
        id: enrollmentId,
        academicClassId: 'class-1',
        streamId: null,
        academicClass: { academicLevelId: 'level-1' },
      });
      prisma.rankingPolicy.findMany.mockResolvedValue([
        {
          id: policyId,
          name: 'Class Ranking',
          scope: 'CLASS',
          method: 'AVERAGE_SCORE',
          tieHandling: 'COMPETITION',
          enabled: true,
          isActive: true,
        },
      ]);
      prisma.subject.findFirst.mockResolvedValue({ name: 'Mathematics' });

      // Enrollment IDs in class: student + 2 others
      prisma.enrollment.findMany.mockResolvedValue([
        { id: enrollmentId },
        { id: 'enr-other-1' },
        { id: 'enr-other-2' },
      ]);

      // Results: student avg 85, other-1 avg 90, other-2 avg 75
      prisma.learnerResult.findMany.mockResolvedValue([
        { enrollmentId, finalScore: 85 },
        { enrollmentId: 'enr-other-1', finalScore: 90 },
        { enrollmentId: 'enr-other-2', finalScore: 75 },
      ]);

      const result = await service.studentRankingDisplay(
        studentId,
        schoolId,
        academicYearId,
        'sub-1',
      );

      expect(result.rankings).toHaveLength(1);
      const ranking = result.rankings[0];
      expect(ranking.rank).toBe(2); // 90 > 85 > 75, student is 2nd
      expect(ranking.totalInGroup).toBe(3);
      expect(ranking.isTie).toBe(false);
      expect(ranking.metric).toBe(85);
      expect(ranking.policyName).toBe('Class Ranking');
      expect(ranking.scope).toBe('CLASS');
      expect(ranking.method).toBe('AVERAGE_SCORE');
    });

    it('should handle ties with COMPETITION tie handling', async () => {
      const policyId = 'policy-1';
      const enrollmentId = 'enr-student';

      prisma.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'Tie',
        middleName: null,
        lastName: 'Student',
        preferredName: null,
        admissionNumber: 'TIE001',
      });
      prisma.academicYear.findFirst.mockResolvedValue({ id: academicYearId, name: '2024' });
      prisma.enrollment.findFirst.mockResolvedValue({
        id: enrollmentId,
        academicClassId: 'class-1',
        streamId: null,
        academicClass: { academicLevelId: 'level-1' },
      });
      prisma.rankingPolicy.findMany.mockResolvedValue([
        {
          id: policyId,
          name: 'School Ranking',
          scope: 'SCHOOL',
          method: 'AVERAGE_SCORE',
          tieHandling: 'COMPETITION',
          enabled: true,
          isActive: true,
        },
      ]);

      prisma.subject.findFirst.mockResolvedValue({ name: 'Mathematics' });
      prisma.academicClass.findMany.mockResolvedValue([{ id: 'class-1' }]);
      prisma.enrollment.findMany.mockResolvedValue([
        { id: enrollmentId },
        { id: 'enr-other-1' },
      ]);

      // Both students have score 85 → tie
      prisma.learnerResult.findMany.mockResolvedValue([
        { enrollmentId, finalScore: 85 },
        { enrollmentId: 'enr-other-1', finalScore: 85 },
      ]);

      const result = await service.studentRankingDisplay(studentId, schoolId, academicYearId, 'sub-1');

      expect(result.rankings).toHaveLength(1);
      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[0].isTie).toBe(true);
      expect(result.rankings[0].totalInGroup).toBe(2);
    });

    it('should skip policies requiring subject when no subjectId provided', async () => {
      const enrollmentId = 'enr-student';

      prisma.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'NoSub',
        middleName: null,
        lastName: 'Student',
        preferredName: null,
        admissionNumber: 'NOS001',
      });
      prisma.academicYear.findFirst.mockResolvedValue({ id: academicYearId, name: '2024' });
      prisma.enrollment.findFirst.mockResolvedValue({
        id: enrollmentId,
        academicClassId: 'class-1',
        streamId: null,
        academicClass: { academicLevelId: 'level-1' },
      });
      prisma.rankingPolicy.findMany.mockResolvedValue([
        {
          id: 'policy-avg',
          name: 'Subject Avg',
          scope: 'CLASS',
          method: 'AVERAGE_SCORE',
          tieHandling: 'COMPETITION',
          enabled: true,
          isActive: true,
        },
      ]);

      // No subjectId → AVERAGE_SCORE policy should be skipped
      const result = await service.studentRankingDisplay(studentId, schoolId, academicYearId);

      expect(result.rankings).toHaveLength(0);
    });

    it('should handle AGGREGATE method without subjectId', async () => {
      const policyId = 'policy-agg';
      const enrollmentId = 'enr-student';

      prisma.student.findFirst.mockResolvedValue({
        id: studentId,
        firstName: 'Agg',
        middleName: null,
        lastName: 'Student',
        preferredName: null,
        admissionNumber: 'AGG001',
      });
      prisma.academicYear.findFirst.mockResolvedValue({ id: academicYearId, name: '2024' });
      prisma.enrollment.findFirst.mockResolvedValue({
        id: enrollmentId,
        academicClassId: 'class-1',
        streamId: null,
        academicClass: { academicLevelId: 'level-1' },
      });
      prisma.rankingPolicy.findMany.mockResolvedValue([
        {
          id: policyId,
          name: 'Aggregate Rank',
          scope: 'CLASS',
          method: 'AGGREGATE',
          tieHandling: 'COMPETITION',
          enabled: true,
          isActive: true,
        },
      ]);

      prisma.enrollment.findMany.mockResolvedValue([
        { id: enrollmentId },
        { id: 'enr-other-1' },
      ]);

      // AGGREGATE sums all subject scores
      prisma.learnerResult.findMany.mockResolvedValue([
        { enrollmentId, finalScore: 80 },
        { enrollmentId, finalScore: 90 },
        { enrollmentId: 'enr-other-1', finalScore: 85 },
        { enrollmentId: 'enr-other-1', finalScore: 70 },
      ]);

      const result = await service.studentRankingDisplay(studentId, schoolId, academicYearId);

      expect(result.rankings).toHaveLength(1);
      expect(result.rankings[0].rank).toBe(1); // 170 > 155
      expect(result.rankings[0].metric).toBe(170);
      expect(result.rankings[0].method).toBe('AGGREGATE');
    });
  });

  // -----------------------------------------------------------------------
  // M22-P3: Class, Stream & Subject Group Analytics
  // -----------------------------------------------------------------------

  describe('classPerformanceSummary', () => {
    const classId = 'class-1';

    it('should throw NotFoundException for non-existent class', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(
        service.classPerformanceSummary(classId, schoolId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should compute class summary with numeric scores and distributions', async () => {
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classId, name: 'S1', code: 'S1C',
      });
      prisma.enrollment.findMany.mockResolvedValue([
        { id: 'enr-1', student: { firstName: 'Alice', middleName: null, lastName: 'Smith', preferredName: null, admissionNumber: 'ADM001' } },
        { id: 'enr-2', student: { firstName: 'Bob', middleName: null, lastName: 'Jones', preferredName: null, admissionNumber: 'ADM002' } },
      ]);
      prisma.learnerResult.findMany.mockResolvedValue([
        { finalScore: 80, grade: 'B', descriptor: 'Good', achievementLevel: 'proficient', subject: { id: 'sub-1', name: 'Math', code: 'MATH' }, enrollment: { id: 'enr-1', student: { firstName: 'Alice', middleName: null, lastName: 'Smith', preferredName: null, admissionNumber: 'ADM001' } } },
        { finalScore: 90, grade: 'B', descriptor: 'Good', achievementLevel: 'proficient', subject: { id: 'sub-1', name: 'Math', code: 'MATH' }, enrollment: { id: 'enr-2', student: { firstName: 'Bob', middleName: null, lastName: 'Jones', preferredName: null, admissionNumber: 'ADM002' } } },
      ]);

      const result: any = await service.classPerformanceSummary(classId, schoolId);

      expect(result.groupId).toBe(classId);
      expect(result.groupName).toBe('S1');
      expect(result.groupCode).toBe('S1C');
      expect(result.groupType).toBe('CLASS');
      expect(result.learnerCount).toBe(2);
      expect(result.totalResults).toBe(2);
      expect(result.numericResultCount).toBe(2);
      expect(result.nonNumericResultCount).toBe(0);
      expect(result.averageScore).toBe(85);
      expect(result.minScore).toBe(80);
      expect(result.maxScore).toBe(90);
      expect(result.modeGrade).toBe('B');
      expect(result.modeDescriptor).toBe('Good');
      expect(result.modeAchievementLevel).toBe('proficient');
      expect(result.scoreDistribution.standardDeviation).toBe(5);
      expect(result.gradeDistribution).toHaveLength(1);
      expect(result.gradeDistribution[0].grade).toBe('B');
      expect(result.gradeDistribution[0].count).toBe(2);
      expect(result.subjectBreakdown).toHaveLength(1);
      expect(result.learnerBreakdown).toHaveLength(2);
    });

    it('should handle empty results for a class', async () => {
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classId, name: 'S1', code: 'S1C',
      });
      prisma.enrollment.findMany.mockResolvedValue([
        { id: 'enr-1', student: { firstName: 'Alice', middleName: null, lastName: 'Smith', preferredName: null, admissionNumber: 'ADM001' } },
      ]);
      prisma.learnerResult.findMany.mockResolvedValue([]);

      const result: any = await service.classPerformanceSummary(classId, schoolId);

      expect(result.learnerCount).toBe(1);
      expect(result.totalResults).toBe(0);
      expect(result.averageScore).toBeNull();
      expect(result.minScore).toBeNull();
      expect(result.maxScore).toBeNull();
      expect(result.modeGrade).toBeNull();
      expect(result.scoreDistribution.averageScore).toBeNull();
      expect(result.scoreDistribution.standardDeviation).toBeNull();
      expect(result.subjectBreakdown).toHaveLength(0);
      expect(result.learnerBreakdown).toHaveLength(0);
    });

    it('should handle all non-numeric competency results', async () => {
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classId, name: 'S1', code: 'S1C',
      });
      prisma.enrollment.findMany.mockResolvedValue([
        { id: 'enr-1', student: { firstName: 'Alice', middleName: null, lastName: 'Smith', preferredName: null, admissionNumber: 'ADM001' } },
      ]);
      prisma.learnerResult.findMany.mockResolvedValue([
        { finalScore: null, grade: 'A', descriptor: 'Excellent', achievementLevel: 'proficient', subject: { id: 'sub-1', name: 'Math', code: 'MATH' }, enrollment: { id: 'enr-1', student: { firstName: 'Alice', middleName: null, lastName: 'Smith', preferredName: null, admissionNumber: 'ADM001' } } },
        { finalScore: null, grade: 'B', descriptor: 'Good', achievementLevel: 'developing', subject: { id: 'sub-2', name: 'English', code: 'ENGL' }, enrollment: { id: 'enr-1', student: { firstName: 'Alice', middleName: null, lastName: 'Smith', preferredName: null, admissionNumber: 'ADM001' } } },
      ]);

      const result: any = await service.classPerformanceSummary(classId, schoolId);

      expect(result.numericResultCount).toBe(0);
      expect(result.nonNumericResultCount).toBe(2);
      expect(result.averageScore).toBeNull();
      expect(result.scoreDistribution.averageScore).toBeNull();
      expect(result.scoreDistribution.standardDeviation).toBeNull();
      expect(result.gradeDistribution).toHaveLength(2);
      expect(result.achievementDistribution).toHaveLength(2);
    });

    it('should filter by subjectId', async () => {
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classId, name: 'S1', code: 'S1C',
      });
      prisma.enrollment.findMany.mockResolvedValue([
        { id: 'enr-1', student: { firstName: 'Alice', middleName: null, lastName: 'Smith', preferredName: null, admissionNumber: 'ADM001' } },
      ]);
      prisma.learnerResult.findMany.mockResolvedValue([]);

      await service.classPerformanceSummary(classId, schoolId, undefined, undefined, 'sub-1');

      const call = prisma.learnerResult.findMany.mock.calls[0][0];
      expect(call.where.subjectId).toBe('sub-1');
    });
  });

  describe('streamPerformanceSummary', () => {
    const streamId = 'stream-1';

    it('should throw NotFoundException for non-existent stream', async () => {
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(
        service.streamPerformanceSummary(streamId, schoolId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should compute stream summary with scores', async () => {
      prisma.stream.findFirst.mockResolvedValue({
        id: streamId, name: 'Stream A', code: 'SA', classId: 'class-1',
      });
      prisma.enrollment.findMany.mockResolvedValue([
        { id: 'enr-1', student: { firstName: 'Alice', middleName: null, lastName: 'Smith', preferredName: null, admissionNumber: 'ADM001' } },
      ]);
      prisma.learnerResult.findMany.mockResolvedValue([
        { finalScore: 75, grade: 'B', descriptor: 'Good', achievementLevel: 'proficient', subject: { id: 'sub-1', name: 'Math', code: 'MATH' }, enrollment: { id: 'enr-1', student: { firstName: 'Alice', middleName: null, lastName: 'Smith', preferredName: null, admissionNumber: 'ADM001' } } },
      ]);

      const result = await service.streamPerformanceSummary(streamId, schoolId);

      expect(result.groupId).toBe(streamId);
      expect(result.groupName).toBe('Stream A');
      expect(result.groupType).toBe('STREAM');
      expect(result.averageScore).toBe(75);
      expect(result.learnerCount).toBe(1);
    });
  });

  describe('subjectPerformanceSummary', () => {
    const subjectId = 'sub-1';

    it('should throw NotFoundException for non-existent subject', async () => {
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.subjectPerformanceSummary(subjectId, schoolId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should compute subject summary with class filter and classBreakdown', async () => {
      prisma.subject.findFirst.mockResolvedValue({
        id: subjectId, name: 'Mathematics', code: 'MATH',
      });
      prisma.enrollment.findMany.mockResolvedValue([
        { id: 'enr-1', academicClassId: 'class-1', student: { firstName: 'Alice', middleName: null, lastName: 'Smith', preferredName: null, admissionNumber: 'ADM001' }, academicClass: { id: 'class-1', name: 'S1', code: 'S1C' } },
      ]);
      prisma.learnerResult.findMany.mockResolvedValue([
        { finalScore: 85, grade: 'A', descriptor: 'Excellent', achievementLevel: 'proficient', enrollment: { id: 'enr-1', student: { firstName: 'Alice', middleName: null, lastName: 'Smith', preferredName: null, admissionNumber: 'ADM001' }, academicClass: { id: 'class-1', name: 'S1', code: 'S1C' } } },
      ]);

      const result: any = await service.subjectPerformanceSummary(subjectId, schoolId, undefined, undefined, 'class-1');

      expect(result.groupId).toBe(subjectId);
      expect(result.groupName).toBe('Mathematics');
      expect(result.groupType).toBe('SUBJECT');
      expect(result.averageScore).toBe(85);
      expect(result.classBreakdown).toHaveLength(1);
      expect(result.classBreakdown[0].className).toBe('S1');
      expect(result.subjectBreakdown).toBeUndefined();
    });
  });

  describe('classPeriodComparison', () => {
    const classId = 'class-1';
    const academicYearId = 'year-1';

    it('should throw NotFoundException for non-existent class', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(
        service.classPeriodComparison(classId, schoolId, academicYearId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should compute term-by-term comparison with year aggregate', async () => {
      prisma.academicClass.findFirst.mockResolvedValue({
        id: classId, name: 'S1', code: 'S1C',
      });
      prisma.academicYear.findFirst.mockResolvedValue({
        id: academicYearId, name: '2024',
        terms: [{ id: 'term-1', name: 'Term 1' }, { id: 'term-2', name: 'Term 2' }],
      });
      prisma.enrollment.findMany.mockResolvedValue([{ id: 'enr-1' }, { id: 'enr-2' }]);
      prisma.learnerResult.findMany
        .mockResolvedValueOnce([{ finalScore: 80, grade: 'B' }, { finalScore: 90, grade: 'A' }])
        .mockResolvedValueOnce([{ finalScore: 80, grade: 'B' }])
        .mockResolvedValueOnce([{ finalScore: 90, grade: 'A' }]);

      const result = await service.classPeriodComparison(classId, schoolId, academicYearId);

      expect(result.groupId).toBe(classId);
      expect(result.groupType).toBe('CLASS');
      expect(result.comparisonPoints).toHaveLength(3);
      expect(result.comparisonPoints[0].termName).toBe('All Terms');
      expect(result.comparisonPoints[0].averageScore).toBe(85);
      expect(result.comparisonPoints[1].termName).toBe('Term 1');
      expect(result.comparisonPoints[1].averageScore).toBe(80);
      expect(result.comparisonPoints[2].termName).toBe('Term 2');
      expect(result.comparisonPoints[2].averageScore).toBe(90);
    });
  });

  describe('streamPeriodComparison', () => {
    it('should throw NotFoundException for non-existent stream', async () => {
      prisma.stream.findFirst.mockResolvedValue(null);

      await expect(
        service.streamPeriodComparison('stream-x', schoolId, 'year-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('subjectPeriodComparison', () => {
    const subjectId = 'sub-1';
    const academicYearId = 'year-1';

    it('should throw NotFoundException for non-existent subject', async () => {
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.subjectPeriodComparison(subjectId, schoolId, academicYearId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should compute subject period comparison with classId filter', async () => {
      prisma.subject.findFirst.mockResolvedValue({
        id: subjectId, name: 'Mathematics', code: 'MATH',
      });
      prisma.academicYear.findFirst.mockResolvedValue({
        id: academicYearId, name: '2024',
        terms: [{ id: 'term-1', name: 'Term 1' }],
      });
      prisma.enrollment.findMany.mockResolvedValue([{ id: 'enr-1' }]);
      prisma.learnerResult.findMany
        .mockResolvedValueOnce([{ finalScore: 75, grade: 'B' }])
        .mockResolvedValueOnce([{ finalScore: 75, grade: 'B' }]);

      const result = await service.subjectPeriodComparison(subjectId, schoolId, academicYearId, 'class-1');

      expect(result.groupId).toBe(subjectId);
      expect(result.groupType).toBe('SUBJECT');
      expect(result.comparisonPoints).toHaveLength(2);
      expect(result.comparisonPoints[0].averageScore).toBe(75);
    });
  });

  describe('compareClasses', () => {
    it('should compare multiple classes and filter out empty ones', async () => {
      prisma.academicClass.findMany.mockResolvedValue([
        { id: 'class-1', name: 'S1', code: 'S1C' },
        { id: 'class-2', name: 'S2', code: 'S2C' },
      ]);
      prisma.enrollment.findMany
        .mockResolvedValueOnce([{ id: 'enr-1' }])
        .mockResolvedValueOnce([]);
      prisma.learnerResult.findMany
        .mockResolvedValueOnce([{ finalScore: 80, grade: 'B' }])
        .mockResolvedValueOnce([]);

      const result = await service.compareClasses(schoolId, 'year-1');

      expect(result.comparisonType).toBe('CLASSES');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].groupId).toBe('class-1');
      expect(result.entries[0].averageScore).toBe(80);
    });

    it('should filter by academicLevelId', async () => {
      prisma.academicClass.findMany.mockResolvedValue([
        { id: 'class-1', name: 'S1', code: 'S1C' },
      ]);
      prisma.enrollment.findMany.mockResolvedValue([{ id: 'enr-1' }]);
      prisma.learnerResult.findMany.mockResolvedValue([{ finalScore: 80, grade: 'B' }]);

      await service.compareClasses(schoolId, 'year-1', 'level-1');

      const call = prisma.academicClass.findMany.mock.calls[0][0];
      expect(call.where.academicLevelId).toBe('level-1');
    });
  });

  describe('compareStreams', () => {
    it('should throw NotFoundException for non-existent class', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(
        service.compareStreams(schoolId, 'class-x', 'year-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should compare streams within a class and filter empty ones', async () => {
      prisma.academicClass.findFirst.mockResolvedValue({ id: 'class-1' });
      prisma.stream.findMany.mockResolvedValue([
        { id: 'stream-1', name: 'Stream A', code: 'SA' },
        { id: 'stream-2', name: 'Stream B', code: 'SB' },
      ]);
      prisma.enrollment.findMany
        .mockResolvedValueOnce([{ id: 'enr-1' }])
        .mockResolvedValueOnce([]);
      prisma.learnerResult.findMany
        .mockResolvedValueOnce([{ finalScore: 85, grade: 'A' }])
        .mockResolvedValueOnce([]);

      const result = await service.compareStreams(schoolId, 'class-1', 'year-1');

      expect(result.comparisonType).toBe('STREAMS');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].groupId).toBe('stream-1');
      expect(result.entries[0].averageScore).toBe(85);
    });
  });

  describe('compareSubjects', () => {
    it('should compare subjects within a class', async () => {
      prisma.academicClass.findFirst.mockResolvedValue({ id: 'class-1', name: 'S1' });
      prisma.enrollment.findMany.mockResolvedValue([{ id: 'enr-1' }, { id: 'enr-2' }]);
      prisma.learnerResult.findMany.mockResolvedValue([
        { finalScore: 80, grade: 'B', subject: { id: 'sub-1', name: 'Math', code: 'MATH' } },
        { finalScore: 90, grade: 'A', subject: { id: 'sub-1', name: 'Math', code: 'MATH' } },
        { finalScore: 70, grade: 'C', subject: { id: 'sub-2', name: 'English', code: 'ENGL' } },
      ]);

      const result = await service.compareSubjects(schoolId, 'class-1', 'year-1');

      expect(result.comparisonType).toBe('SUBJECTS');
      expect(result.entries).toHaveLength(2);
      const math = result.entries.find((e) => e.groupCode === 'MATH');
      const english = result.entries.find((e) => e.groupCode === 'ENGL');
      expect(math?.averageScore).toBe(85);
      expect(english?.averageScore).toBe(70);
    });

    it('should throw NotFoundException for non-existent class', async () => {
      prisma.academicClass.findFirst.mockResolvedValue(null);

      await expect(
        service.compareSubjects(schoolId, 'class-x', 'year-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('M22-P3 tenant isolation — schoolId on group queries', () => {
    it('classPerformanceSummary includes schoolId in LearnerResult where clause', async () => {
      prisma.academicClass.findFirst.mockResolvedValue({ id: 'class-1', name: 'S1', code: 'S1C' });
      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.learnerResult.findMany.mockResolvedValue([]);

      await service.classPerformanceSummary('class-1', schoolId);

      const call = prisma.learnerResult.findMany.mock.calls[0][0];
      expect(call.where.schoolId).toBe(schoolId);
    });

    it('compareClasses includes schoolId in LearnerResult where clause', async () => {
      prisma.academicClass.findMany.mockResolvedValue([{ id: 'class-1', name: 'S1', code: 'S1C' }]);
      prisma.enrollment.findMany.mockResolvedValue([{ id: 'enr-1' }]);
      prisma.learnerResult.findMany.mockResolvedValue([]);

      await service.compareClasses(schoolId, 'year-1');

      const call = prisma.learnerResult.findMany.mock.calls[0][0];
      expect(call.where.schoolId).toBe(schoolId);
    });
  });
});
