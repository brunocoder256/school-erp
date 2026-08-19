import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RankingMethod, RankingScope } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { rankEntries } from '../engines/ranking.engine';
import type { RankedLearnerResponse } from '../dto/assessments-response.dto';
import { RankingsQueryDto } from '../dto/rankings-query.dto';
import { requireActiveSchoolId } from './assessment-context.util';

const ELIGIBLE_RESULT_STATUSES = ['APPROVED', 'LOCKED', 'AMENDED'];

/**
 * Optional ranking of learners, separate from grading. Only finalized
 * results (approved, locked or amended) are ranked so a ranking run never
 * exposes provisional or draft data. Ties are broken deterministically by
 * the configured tie handling.
 */
@Injectable()
export class RankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(
    activeSchoolId: string | null,
    query: RankingsQueryDto,
  ): Promise<RankedLearnerResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const policy = await this.prisma.rankingPolicy.findFirst({
      where: { id: query.policyId, schoolId },
    });

    if (!policy) {
      throw new NotFoundException('Ranking policy not found.');
    }

    if (!policy.enabled || !policy.isActive) {
      throw new BadRequestException('The ranking policy is disabled.');
    }

    const scope = query.scope ?? policy.scope;
    const method = policy.method;

    const scopeEnrollmentIds = await this.resolveScopeEnrollmentIds(
      schoolId,
      scope,
      query,
    );

    const resultsWhere: Record<string, unknown> = {
      schoolId,
      status: { in: ELIGIBLE_RESULT_STATUSES },
      enrollmentId: { in: scopeEnrollmentIds },
    };

    if (query.academicYearId !== undefined) {
      resultsWhere.academicYearId = query.academicYearId;
    }

    if (method !== RankingMethod.AGGREGATE) {
      if (!query.subjectId) {
        throw new BadRequestException(
          'A subject is required for total and average score ranking.',
        );
      }
      resultsWhere.subjectId = query.subjectId;
    }

    const results = await this.prisma.learnerResult.findMany({
      where: resultsWhere,
    });

    const metricByEnrollment = new Map<string, { sum: number; count: number }>();

    for (const result of results) {
      if (result.finalScore === null) {
        continue;
      }

      const aggregate = metricByEnrollment.get(result.enrollmentId) ?? { sum: 0, count: 0 };
      aggregate.sum += Number(result.finalScore);
      aggregate.count += 1;
      metricByEnrollment.set(result.enrollmentId, aggregate);
    }

    const entries = [...metricByEnrollment.entries()].map(([enrollmentId, aggregate]) => ({
      key: enrollmentId,
      metric:
        method === RankingMethod.AVERAGE_SCORE
          ? aggregate.count > 0
            ? aggregate.sum / aggregate.count
            : null
          : aggregate.sum,
    }));

    const ranked = rankEntries(entries, policy.tieHandling);

    return ranked.map((entry) => ({
      rank: entry.rank,
      tie: entry.tie,
      enrollmentId: entry.key,
      metric: entry.metric,
      finalScore: entry.metric,
      grade: null,
    }));
  }

  private async resolveScopeEnrollmentIds(
    schoolId: string,
    scope: RankingScope,
    query: RankingsQueryDto,
  ): Promise<string[]> {
    let classIds: string[] = [];

    if (scope === RankingScope.STREAM) {
      if (!query.streamId) {
        throw new BadRequestException(
          'A stream is required to rank within a stream scope.',
        );
      }

      const stream = await this.prisma.stream.findFirst({
        where: { id: query.streamId },
        select: { id: true, classId: true },
      });

      if (!stream) {
        throw new NotFoundException('Stream not found.');
      }

      await this.requireClassInSchool(schoolId, stream.classId);

      return this.enrollmentIds({ streamId: query.streamId });
    }

    if (scope === RankingScope.CLASS) {
      if (!query.academicClassId) {
        throw new BadRequestException(
          'An academic class is required to rank within a class scope.',
        );
      }

      await this.requireClassInSchool(schoolId, query.academicClassId);
      classIds = [query.academicClassId];
    } else if (scope === RankingScope.ACADEMIC_LEVEL) {
      if (!query.academicClassId) {
        throw new BadRequestException(
          'An academic class is required to resolve the academic level scope.',
        );
      }

      const academicClass = await this.prisma.academicClass.findFirst({
        where: { id: query.academicClassId, schoolId },
        select: { academicLevelId: true },
      });

      if (!academicClass) {
        throw new NotFoundException('Academic class not found.');
      }

      const levelClasses = await this.prisma.academicClass.findMany({
        where: { schoolId, academicLevelId: academicClass.academicLevelId },
        select: { id: true },
      });

      classIds = levelClasses.map((item) => item.id);
    } else {
      classIds = await this.allClassIds(schoolId);
    }

    return this.enrollmentIds({ academicClassId: { in: classIds } });
  }

  private async enrollmentIds(where: Record<string, unknown>): Promise<string[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where,
      select: { id: true },
    });

    return enrollments.map((enrollment) => enrollment.id);
  }

  private async allClassIds(schoolId: string): Promise<string[]> {
    const classes = await this.prisma.academicClass.findMany({
      where: { schoolId },
      select: { id: true },
    });

    return classes.map((academicClass) => academicClass.id);
  }

  private async requireClassInSchool(
    schoolId: string,
    classId: string,
  ): Promise<void> {
    const academicClass = await this.prisma.academicClass.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    });

    if (!academicClass) {
      throw new NotFoundException('Academic class not found.');
    }
  }
}