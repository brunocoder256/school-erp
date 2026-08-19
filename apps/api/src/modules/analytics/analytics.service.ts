import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ResultStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';
import { rankEntries } from '../assessments/engines/ranking.engine';
import type { StudentRankingEntry } from './dto/student-performance.dto';

const FINALIZED_STATUSES: ResultStatus[] = ['APPROVED', 'LOCKED', 'AMENDED'];

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify that the schoolId matches the user's active school context.
   * Throws BadRequest if the school is not accessible to the caller.
   */
  verifySchoolAccess(schoolId: string, userSchoolId: string): void {
    if (schoolId !== userSchoolId) {
      throw new BadRequestException(
        'School context does not match the authenticated user\'s active school.',
      );
    }
  }

  /**
   * Student performance summary — subject-by-subject breakdown with overall aggregates.
   * Only uses finalized M12 results (APPROVED/LOCKED/AMENDED).
   * Handles numeric scores, grades, descriptors and achievement levels.
   * Does not force competency outcomes into percentages.
   */
  async studentPerformanceSummary(
    studentId: string,
    schoolId: string,
    academicYearId?: string,
    termId?: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        preferredName: true,
        admissionNumber: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this school.');
    }

    const where: Record<string, unknown> = {
      schoolId,
      enrollment: { studentId },
      status: { in: FINALIZED_STATUSES },
    };
    if (academicYearId) where.academicYearId = academicYearId;
    if (termId) where.termId = termId;

    const results = await this.prisma.learnerResult.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    const subjectMap = new Map<string, {
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      scores: number[];
      grades: string[];
      descriptors: string[];
      achievementLevels: string[];
    }>();

    let totalScoreSum = 0;
    let numericCount = 0;
    let nonNumericCount = 0;

    for (const result of results) {
      const subjectId = result.subjectId;
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subjectId,
          subjectName: result.subject?.name ?? 'Unknown',
          subjectCode: result.subject?.code ?? 'UNKNOWN',
          scores: [],
          grades: [],
          descriptors: [],
          achievementLevels: [],
        });
      }
      const entry = subjectMap.get(subjectId)!;
      if (result.finalScore != null) {
        entry.scores.push(Number(result.finalScore));
        totalScoreSum += Number(result.finalScore);
        numericCount++;
      } else {
        nonNumericCount++;
      }
      if (result.grade) entry.grades.push(result.grade);
      if (result.descriptor) entry.descriptors.push(result.descriptor);
      if (result.achievementLevel) entry.achievementLevels.push(result.achievementLevel);
    }

    const subjectPerformance = Array.from(subjectMap.values()).map((entry) => {
      const avgScore = entry.scores.length > 0
        ? Number((entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length).toFixed(2))
        : null;
      const minScore = entry.scores.length > 0 ? Math.min(...entry.scores) : null;
      const maxScore = entry.scores.length > 0 ? Math.max(...entry.scores) : null;

      const latestGrade = entry.grades.length > 0 ? entry.grades[entry.grades.length - 1] : null;
      const latestDescriptor = entry.descriptors.length > 0
        ? entry.descriptors[entry.descriptors.length - 1]
        : null;
      const latestAchievement = entry.achievementLevels.length > 0
        ? entry.achievementLevels[entry.achievementLevels.length - 1]
        : null;
      const latestFinalScore = entry.scores.length > 0 ? entry.scores[entry.scores.length - 1] : null;

      return {
        subjectId: entry.subjectId,
        subjectName: entry.subjectName,
        subjectCode: entry.subjectCode,
        assessmentCount: entry.scores.length + entry.grades.length,
        resultCount: entry.scores.length + entry.grades.length,
        averageScore: avgScore,
        minScore,
        maxScore,
        grade: latestGrade,
        descriptor: latestDescriptor,
        achievementLevel: latestAchievement,
        finalScore: latestFinalScore,
      };
    });

    const overallAverageScore = numericCount > 0
      ? Number((totalScoreSum / numericCount).toFixed(2))
      : null;

    const numericResults = results.filter((r) => r.finalScore != null);
    const overallMinScore = numericResults.length > 0
      ? Math.min(...numericResults.map((r) => Number(r.finalScore)))
      : null;
    const overallMaxScore = numericResults.length > 0
      ? Math.max(...numericResults.map((r) => Number(r.finalScore)))
      : null;

    const allGrades = results.map((r) => r.grade).filter((g): g is string => g !== null);
    const overallGrade = this._mode(this._countBy(allGrades));

    const allDescriptors = results.map((r) => r.descriptor).filter(
      (d): d is string => d !== null,
    );
    const overallDescriptor = this._mode(this._countBy(allDescriptors));

    const allAchievements = results
      .map((r) => r.achievementLevel)
      .filter((a): a is string => a !== null);
    const overallAchievementLevel = this._mode(this._countBy(allAchievements));

    const studentName = this._buildStudentName(student);

    return {
      studentId,
      studentName,
      admissionNumber: student.admissionNumber,
      academicYearId,
      termId,
      overallAverageScore,
      overallMinScore,
      overallMaxScore,
      overallGrade,
      overallDescriptor,
      overallAchievementLevel,
      totalResults: results.length,
      numericResultCount: numericCount,
      nonNumericResultCount: nonNumericCount,
      subjectPerformance,
    };
  }

  /**
   * Period comparison — shows average score across configurable academic periods.
   * Works with terms within an academic year; does not assume exactly three terms.
   */
  async studentPeriodComparison(
    studentId: string,
    schoolId: string,
    academicYearId: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this school.');
    }

    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      include: { terms: { orderBy: { name: 'asc' } } },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found in this school.');
    }

    const points: Array<{
      academicYearId: string;
      termId?: string;
      termName?: string;
      averageScore: number | null;
      resultCount: number;
    }> = [];

    for (const term of academicYear.terms) {
      const termScores = await this.prisma.learnerResult.findMany({
      where: {
        schoolId,
        enrollment: { studentId },
        academicYearId,
        termId: term.id,
        status: { in: FINALIZED_STATUSES },
        finalScore: { not: null },
      },
      select: { finalScore: true },
    });

      const scores = termScores.map((r) => Number(r.finalScore));
      const avgScore = scores.length > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : null;

      points.push({
        academicYearId,
        termId: term.id,
        termName: term.name,
        averageScore: avgScore,
        resultCount: termScores.length,
      });
    }

    // Academic year aggregate
    const yearScores = await this.prisma.learnerResult.findMany({
      where: {
        schoolId,
        enrollment: { studentId },
        academicYearId,
        status: { in: FINALIZED_STATUSES },
        finalScore: { not: null },
      },
      select: { finalScore: true },
    });

    const yearScoresArr = yearScores.map((r) => Number(r.finalScore));
    const yearAvg = yearScoresArr.length > 0
      ? Number((yearScoresArr.reduce((a, b) => a + b, 0) / yearScoresArr.length).toFixed(2))
      : null;

    points.unshift({
      academicYearId,
      termName: 'All Terms',
      averageScore: yearAvg,
      resultCount: yearScoresArr.length,
    });

    return {
      studentId,
      academicYearId,
      comparisonPoints: points,
    };
  }

  /**
   * Academic trend — aggregates performance across multiple academic years.
   * Does not assume a fixed number of terms or years.
   */
  async studentAcademicTrend(
    studentId: string,
    schoolId: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this school.');
    }

    const academicYears = await this.prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    const allTerms = await this.prisma.term.findMany({
      where: { academicYear: { schoolId } },
      orderBy: [{ academicYear: { name: 'asc' } }, { name: 'asc' }],
      include: { academicYear: { select: { id: true, name: true } } },
    });

    const points: Array<{
      academicYearId: string;
      academicYearName: string;
      termId?: string;
      termName?: string;
      averageScore: number | null;
      resultCount: number;
      gradeDistribution: Record<string, number>;
    }> = [];

    for (const year of academicYears) {
      const yearResults = await this.prisma.learnerResult.findMany({
      where: {
        schoolId,
        enrollment: { studentId },
        academicYearId: year.id,
        status: { in: FINALIZED_STATUSES },
        finalScore: { not: null },
      },
    });

      const scores = yearResults.map((r) => Number(r.finalScore));
      const avgScore = scores.length > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : null;

      const gradeCounts = this._countBy(
        yearResults.map((r) => r.grade).filter((g): g is string => g != null),
      );

      points.push({
        academicYearId: year.id,
        academicYearName: year.name,
        averageScore: avgScore,
        resultCount: yearResults.length,
        gradeDistribution: gradeCounts,
      });

      for (const term of allTerms.filter((t) => t.academicYearId === year.id)) {
        const termResults = await this.prisma.learnerResult.findMany({
      where: {
        schoolId,
        enrollment: { studentId },
        academicYearId: year.id,
        termId: term.id,
        status: { in: FINALIZED_STATUSES },
        finalScore: { not: null },
      },
    });

        const termScores = termResults.map((r) => Number(r.finalScore));
        const termAvg = termScores.length > 0
          ? Number((termScores.reduce((a, b) => a + b, 0) / termScores.length).toFixed(2))
          : null;

        const termGradeCounts = this._countBy(
          termResults.map((r) => r.grade).filter((g): g is string => g != null),
        );

        points.push({
          academicYearId: year.id,
          academicYearName: year.name,
          termId: term.id,
          termName: term.name,
          averageScore: termAvg,
          resultCount: termResults.length,
          gradeDistribution: termGradeCounts,
        });
      }
    }

    return {
      studentId,
      trendPoints: points,
    };
  }

  /**
   * Strengths and weaknesses analysis using deterministic rules.
   * Strength = subject average above overall average.
   * Weakness = subject average below overall average OR no finalised score.
   */
  async studentStrengthsWeaknesses(
    studentId: string,
    schoolId: string,
    academicYearId?: string,
    termId?: string,
  ) {
    const summary = await this.studentPerformanceSummary(studentId, schoolId, academicYearId, termId);

    const overallAvg = summary.overallAverageScore ?? 0;
    const strengths: Array<{
      subjectId: string;
      subjectName: string;
      reason: string;
      averageScore: number | null;
      grade: string | null;
    }> = [];
    const weaknesses: Array<{
      subjectId: string;
      subjectName: string;
      reason: string;
      averageScore: number | null;
      grade: string | null;
    }> = [];

    for (const subj of summary.subjectPerformance) {
      if (subj.averageScore != null && subj.averageScore > overallAvg) {
        strengths.push({
          subjectId: subj.subjectId,
          subjectName: subj.subjectName,
          reason: `Average score ${subj.averageScore}% is above overall average ${overallAvg}%`,
          averageScore: subj.averageScore,
          grade: subj.grade,
        });
      } else if (subj.averageScore != null && subj.averageScore < overallAvg) {
        weaknesses.push({
          subjectId: subj.subjectId,
          subjectName: subj.subjectName,
          reason: `Average score ${subj.averageScore}% is below overall average ${overallAvg}%`,
          averageScore: subj.averageScore,
          grade: subj.grade,
        });
      } else if (subj.averageScore === null && subj.grade === null && subj.achievementLevel === null) {
        weaknesses.push({
          subjectId: subj.subjectId,
          subjectName: subj.subjectName,
          reason: 'No finalised numeric score, grade, or achievement level available',
          averageScore: null,
          grade: null,
        });
      }
    }

    return {
      studentId,
      strengths,
      weaknesses,
    };
  }

  /**
   * Result completion — shows which subjects have all assessments completed
   * vs which have pending/incomplete results for a given student.
   */
  async studentResultCompletion(
    studentId: string,
    schoolId: string,
    academicYearId?: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this school.');
    }

    const assessmentWhere: Record<string, unknown> = {
      schoolId,
    };
    if (academicYearId) assessmentWhere.academicYearId = academicYearId;

    const assessments = await this.prisma.assessment.findMany({
      where: assessmentWhere,
      select: { id: true, subjectId: true, subject: { select: { name: true, code: true } } },
    });

    const where: Record<string, unknown> = {
      schoolId,
      enrollment: { studentId },
      status: { in: FINALIZED_STATUSES },
    };
    if (academicYearId) where.academicYearId = academicYearId;

    const results = await this.prisma.learnerResult.findMany({
      where,
    });

    const resultAssessmentSet = new Set(results.map((r) => r.assessmentId));

    const subjectMap = new Map<string, {
      subjectId: string;
      subjectName: string;
      assessments: string[];
    }>();

    for (const a of assessments) {
      const key = a.subjectId;
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          subjectId: a.subjectId,
          subjectName: a.subject?.name ?? 'Unknown',
          assessments: [],
        });
      }
      subjectMap.get(key)!.assessments.push(a.id);
    }

    const completion = Array.from(subjectMap.values()).map((entry) => {
      const resultCount = entry.assessments.filter((id) => resultAssessmentSet.has(id)).length;
      const total = entry.assessments.length;
      const pending = total - resultCount;
      const pct = total > 0 ? Number((resultCount / total * 100).toFixed(2)) : 0;

      return {
        subjectId: entry.subjectId,
        subjectName: entry.subjectName,
        assessmentCount: total,
        resultCount,
        completionPercentage: pct,
        pendingAssessments: pending,
      };
    });

    const totalAssessments = assessments.length;
    const totalResults = results.length;
    const overallPct = totalAssessments > 0
      ? Number((totalResults / totalAssessments * 100).toFixed(2))
      : 0;

    return {
      studentId,
      academicYearId,
      completion,
      overallCompletionPercentage: overallPct,
    };
  }

  /**
   * Distribution analysis — score, grade, and achievement level distributions.
   * Handles non-numeric outcomes by excluding scores from statistics.
   */
  async studentDistributionAnalysis(
    studentId: string,
    schoolId: string,
    academicYearId?: string,
    termId?: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this school.');
    }

    const where: Record<string, unknown> = {
      schoolId,
      enrollment: { studentId },
      status: { in: FINALIZED_STATUSES },
    };
    if (academicYearId) where.academicYearId = academicYearId;
    if (termId) where.termId = termId;

    const results = await this.prisma.learnerResult.findMany({
      where,
    });

    const scores = results
      .filter((r) => r.finalScore != null)
      .map((r) => Number(r.finalScore));

    const scoreDistribution = scores.length > 0
      ? {
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores),
        averageScore: Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)),
        standardDeviation: Number(
          Math.sqrt(
            scores.reduce((sum, v) => {
              const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
              return sum + Math.pow(v - mean, 2);
            }, 0) / scores.length,
          ).toFixed(2),
        ),
        quartiles: this._computeQuartiles(scores),
      }
      : {
        minScore: null,
        maxScore: null,
        averageScore: null,
        standardDeviation: null,
        quartiles: { q1: null, q2: null, q3: null },
      };

    const allGrades = results.map((r) => r.grade).filter((g): g is string => g != null);
    const gradeCounts = this._countBy(allGrades);
    const gradeDistribution: Array<{
      grade: string | null;
      count: number;
      percentage: number;
    }> = [];

    for (const [grade, count] of Object.entries(gradeCounts)) {
      const pct = results.length > 0
        ? Number((count / results.length * 100).toFixed(2))
        : 0;
      gradeDistribution.push({ grade, count: Number(count), percentage: pct });
    }

    const allAchievements = results
      .map((r) => r.achievementLevel)
      .filter((a): a is string => a != null);
    const achievementCounts = this._countBy(allAchievements);
    const achievementDistribution: Array<{
      achievementLevel: string | null;
      count: number;
      percentage: number;
    }> = [];

    for (const [level, count] of Object.entries(achievementCounts)) {
      const pct = results.length > 0
        ? Number((count / results.length * 100).toFixed(2))
        : 0;
      achievementDistribution.push({
        achievementLevel: level,
        count: Number(count),
        percentage: pct,
      });
    }

    return {
      studentId,
      academicYearId,
      termId,
      scoreDistribution,
      gradeDistribution,
      achievementDistribution,
    };
  }

  // --- Helpers ---

  private _countBy(keys: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const key of keys) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }

  private _mode(counts: Record<string, number>): string | null {
    let maxKey: string | null = null;
    let maxCount = 0;
    for (const [key, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxKey = key;
      }
    }
    return maxKey;
  }

  private _computeQuartiles(scores: number[]): { q1: number | null; q2: number | null; q3: number | null } {
    if (scores.length === 0) {
      return { q1: null, q2: null, q3: null };
    }
    const sorted = [...scores].sort((a, b) => a - b);

    const percentile = (arr: number[], p: number): number => {
      const n = arr.length;
      const k = (n - 1) * p;
      const f = Math.floor(k);
      const c = Math.ceil(k);
      if (f === c) return arr[f];
      const d0 = arr[f] * (c - k);
      const d1 = arr[c] * (k - f);
      return d0 + d1;
    };

    return {
      q1: Number(percentile(sorted, 0.25).toFixed(2)),
      q2: Number(percentile(sorted, 0.5).toFixed(2)),
      q3: Number(percentile(sorted, 0.75).toFixed(2)),
    };
  }

  /**
   * Ranking display — surfaces the student's rank from M12 ranking policies.
   * Analytics never recalculates grades or rankings; it reads finalized results
   * and applies the same deterministic ranking algorithm as M12.
   * Only finalized results (APPROVED/LOCKED/AMENDED) participate.
   */
  async studentRankingDisplay(
    studentId: string,
    schoolId: string,
    academicYearId: string,
    subjectId?: string,
    policyId?: string,
    scopeOverride?: string,
    academicClassId?: string,
    streamId?: string,
    termId?: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        preferredName: true,
        admissionNumber: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this school.');
    }

    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true, name: true },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found in this school.');
    }

    // Resolve the student's current enrollment to determine class/stream context
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, academicYearId },
      select: {
        id: true,
        academicClassId: true,
        streamId: true,
        academicClass: {
          select: { academicLevelId: true },
        },
      },
    });

    // Resolve subject name if subjectId provided
    let subjectName: string | undefined;
    if (subjectId) {
      const subject = await this.prisma.subject.findFirst({
        where: { id: subjectId, schoolId },
        select: { name: true },
      });
      subjectName = subject?.name;
    }

    // Fetch ranking policies
    const policyWhere: Record<string, unknown> = {
      schoolId,
      enabled: true,
      isActive: true,
    };
    if (policyId) policyWhere.id = policyId;

    const policies = await this.prisma.rankingPolicy.findMany({
      where: policyWhere,
    });

    if (policies.length === 0) {
      return {
        studentId,
        studentName: this._buildStudentName(student),
        admissionNumber: student.admissionNumber,
        rankings: [] as StudentRankingEntry[],
      };
    }

    // Resolve term name if termId provided
    let termName: string | undefined;
    if (termId) {
      const term = await this.prisma.term.findFirst({
        where: { id: termId, academicYearId },
        select: { name: true },
      });
      termName = term?.name;
    }

    const rankings: StudentRankingEntry[] = [];

    for (const policy of policies) {
      const scope = scopeOverride ?? policy.scope;
      const method = policy.method;

      // For TOTAL_SCORE and AVERAGE_SCORE, subjectId is required
      if (method !== 'AGGREGATE' && !subjectId) {
        continue; // Skip policies that require a subject when none is provided
      }

      // Resolve enrollment IDs in the ranking scope
      const scopeEnrollmentIds = await this._resolveScopeEnrollmentIds(
        schoolId,
        scope,
        enrollment,
        academicClassId,
        streamId,
      );

      if (scopeEnrollmentIds.length === 0) continue;

      // Fetch finalized results for the scope
      const resultsWhere: Record<string, unknown> = {
        schoolId,
        status: { in: FINALIZED_STATUSES },
        academicYearId,
        enrollmentId: { in: scopeEnrollmentIds },
      };

      if (termId) resultsWhere.termId = termId;
      if (subjectId && method !== 'AGGREGATE') resultsWhere.subjectId = subjectId;

      const results = await this.prisma.learnerResult.findMany({
        where: resultsWhere,
        select: { enrollmentId: true, finalScore: true },
      });

      // Aggregate metrics per enrollment
      const metricByEnrollment = new Map<string, { sum: number; count: number }>();
      for (const result of results) {
        if (result.finalScore === null) continue;
        const agg = metricByEnrollment.get(result.enrollmentId) ?? { sum: 0, count: 0 };
        agg.sum += Number(result.finalScore);
        agg.count += 1;
        metricByEnrollment.set(result.enrollmentId, agg);
      }

      const entries = [...metricByEnrollment.entries()].map(([enrollmentId, agg]) => ({
        key: enrollmentId,
        metric:
          method === 'AVERAGE_SCORE'
            ? agg.count > 0
              ? Number((agg.sum / agg.count).toFixed(2))
              : null
            : Number(agg.sum.toFixed(2)),
      }));

      if (entries.length === 0) continue;

      const ranked = rankEntries(entries, policy.tieHandling);

      // Find the student's enrollment in the ranked list
      const studentEnrollmentId = enrollment?.id;
      if (!studentEnrollmentId) continue;

      const studentEntry = ranked.find((e) => e.key === studentEnrollmentId);

      rankings.push({
        rank: studentEntry?.rank ?? null,
        totalInGroup: ranked.length,
        isTie: studentEntry?.tie ?? false,
        scope,
        method,
        metric: studentEntry?.metric ?? null,
        academicYearId: academicYear.id,
        academicYearName: academicYear.name,
        termId,
        termName,
        subjectId,
        subjectName,
        policyId: policy.id,
        policyName: policy.name,
      });
    }

    return {
      studentId,
      studentName: this._buildStudentName(student),
      admissionNumber: student.admissionNumber,
      rankings,
    };
  }

  /**
   * Resolve enrollment IDs within a ranking scope.
   */
  private async _resolveScopeEnrollmentIds(
    schoolId: string,
    scope: string,
    enrollment: { id: string; academicClassId: string; streamId: string | null; academicClass: { academicLevelId: string } } | null,
    academicClassId?: string,
    streamId?: string,
  ): Promise<string[]> {
    if (scope === 'STREAM') {
      const targetStreamId = streamId ?? enrollment?.streamId;
      if (!targetStreamId) return [];

      const enrollments = await this.prisma.enrollment.findMany({
        where: { streamId: targetStreamId },
        select: { id: true },
      });
      return enrollments.map((e) => e.id);
    }

    if (scope === 'CLASS') {
      const targetClassId = academicClassId ?? enrollment?.academicClassId;
      if (!targetClassId) return [];

      const enrollments = await this.prisma.enrollment.findMany({
        where: { academicClassId: targetClassId },
        select: { id: true },
      });
      return enrollments.map((e) => e.id);
    }

    if (scope === 'ACADEMIC_LEVEL') {
      const targetClassId = academicClassId ?? enrollment?.academicClassId;
      if (!targetClassId) return [];

      const academicClass = await this.prisma.academicClass.findFirst({
        where: { id: targetClassId, schoolId },
        select: { academicLevelId: true },
      });
      if (!academicClass) return [];

      const levelClasses = await this.prisma.academicClass.findMany({
        where: { schoolId, academicLevelId: academicClass.academicLevelId },
        select: { id: true },
      });
      const classIds = levelClasses.map((c) => c.id);

      const enrollments = await this.prisma.enrollment.findMany({
        where: { academicClassId: { in: classIds } },
        select: { id: true },
      });
      return enrollments.map((e) => e.id);
    }

    // SCHOOL scope — all enrollments in the school's classes
    const allClasses = await this.prisma.academicClass.findMany({
      where: { schoolId },
      select: { id: true },
    });
    const allClassIds = allClasses.map((c) => c.id);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { academicClassId: { in: allClassIds } },
      select: { id: true },
    });
    return enrollments.map((e) => e.id);
  }

  private _buildStudentName(student: {
    preferredName?: string | null;
    firstName: string;
    middleName?: string | null;
    lastName: string;
  }): string {
    return student.preferredName
      ?? [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(' ');
  }
}
