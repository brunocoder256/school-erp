import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { calculateLearnerScore } from '../engines/calculation.engine';
import { gradeScore } from '../engines/grading.engine';
import type {
  LearnerResultResponse,
  ResultAmendmentResponse,
} from '../dto/assessments-response.dto';
import { requireActiveSchoolId } from './assessment-context.util';

/**
 * Computes the final score, grade, descriptor and achievement level of every
 * learner who was assessed on an assessment.
 *
 * The calculation only touches draft results: once a result has been
 * submitted, approved, locked or amended it is finalized and protected from
 * silent recalculation (corrections go through the explicit amend flow).
 */
@Injectable()
export class ResultCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(
    activeSchoolId: string | null,
    assessmentId: string,
  ): Promise<LearnerResultResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    const components = await this.prisma.assessmentComponent.findMany({
      where: { assessmentId },
      orderBy: { displayOrder: 'asc' },
    });

    if (components.length === 0) {
      return [];
    }

    const schemeWeights = new Map<string, { weight: number | null; maxScore: number }>();

    if (assessment.schemeVersionId) {
      const schemeComponentIds = components
        .map((component) => component.schemeComponentDefinitionId)
        .filter((id): id is string => id !== null);

      if (schemeComponentIds.length > 0) {
        const definitions = await this.prisma.schemeComponentDefinition.findMany({
          where: { id: { in: schemeComponentIds } },
        });

        for (const definition of definitions) {
          schemeWeights.set(definition.id, {
            weight: definition.weight,
            maxScore: Number(definition.maxScore),
          });
        }
      }
    }

    const sourceAssessmentIds = components
      .map((component) => component.sourceAssessmentId)
      .filter((id): id is string => id !== null);

    const scores = await this.prisma.assessmentScore.findMany({
      where: { assessmentId },
    });

    const validScores = scores.filter(
      (score) => score.status === 'PRESENT' && score.score !== null,
    );

    const sourceResults =
      sourceAssessmentIds.length > 0
        ? await this.prisma.learnerResult.findMany({
            where: { assessmentId: { in: sourceAssessmentIds } },
          })
        : [];

    const sourceScoreByEnrollment = new Map<string, Map<string, number>>();
    for (const result of sourceResults) {
      if (result.finalScore === null) {
        continue;
      }
      const byEnrollment =
        sourceScoreByEnrollment.get(result.assessmentId) ?? new Map<string, number>();
      byEnrollment.set(result.enrollmentId, Number(result.finalScore));
      sourceScoreByEnrollment.set(result.assessmentId, byEnrollment);
    }

    const enrollmentIds = new Set<string>();

    for (const score of validScores) {
      enrollmentIds.add(score.enrollmentId);
    }

    for (const result of sourceResults) {
      if (result.finalScore !== null) {
        enrollmentIds.add(result.enrollmentId);
      }
    }

    const calcComponents = components.map((component) => {
      const scheme =
        component.schemeComponentDefinitionId !== null
          ? schemeWeights.get(component.schemeComponentDefinitionId)
          : undefined;

      const isSource =
        component.sourceAssessmentId !== null &&
        sourceScoreByEnrollment.has(component.sourceAssessmentId as string);

      return {
        id: component.id,
        weight: scheme?.weight ?? component.weight ?? null,
        maxScore: isSource ? 100 : scheme?.maxScore ?? Number(component.maxScore),
      };
    });

    const scoredByEnrollment = new Map<string, Map<string, number>>();

    for (const score of validScores) {
      const byEnrollment = scoredByEnrollment.get(score.enrollmentId) ?? new Map<string, number>();
      byEnrollment.set(score.componentId, Number(score.score));
      scoredByEnrollment.set(score.enrollmentId, byEnrollment);
    }

    for (const component of components) {
      if (component.sourceAssessmentId === null) {
        continue;
      }
      const sourceScores = sourceScoreByEnrollment.get(component.sourceAssessmentId);
      if (!sourceScores) {
        continue;
      }
      for (const [enrollmentId, finalScore] of sourceScores) {
        const byEnrollment = scoredByEnrollment.get(enrollmentId) ?? new Map<string, number>();
        byEnrollment.set(component.id, finalScore);
        scoredByEnrollment.set(enrollmentId, byEnrollment);
      }
    }

    let gradingBands: Array<{
      minScore: number;
      maxScore: number;
      grade: string;
      descriptor: string | null;
      achievementLevel: string | null;
    }> = [];
    let gradingSchemeVersionId: string | null = null;

    if (assessment.schemeVersionId) {
      const schemeVersion = await this.prisma.assessmentSchemeVersion.findFirst({
        where: { id: assessment.schemeVersionId },
        select: { gradingSchemeVersionId: true },
      });

      if (schemeVersion?.gradingSchemeVersionId) {
        gradingSchemeVersionId = schemeVersion.gradingSchemeVersionId;
        const bands = await this.prisma.gradingBand.findMany({
          where: { versionId: gradingSchemeVersionId },
          orderBy: { displayOrder: 'asc' },
        });

        gradingBands = bands.map((band) => ({
          minScore: Number(band.minScore),
          maxScore: Number(band.maxScore),
          grade: band.grade,
          descriptor: band.descriptor,
          achievementLevel: band.achievementLevel,
        }));
      }
    }

    const results: LearnerResultResponse[] = [];

    for (const enrollmentId of enrollmentIds) {
      const scored = scoredByEnrollment.get(enrollmentId);

      if (!scored || scored.size === 0) {
        continue;
      }

      const calculation = calculateLearnerScore({
        enrollmentId,
        components: calcComponents,
        scored,
      });

      const graded = gradeScore(calculation.finalScore, gradingBands);

      const existing = await this.prisma.learnerResult.findFirst({
        where: {
          assessmentId,
          enrollmentId,
        },
        select: { id: true, status: true },
      });

      if (existing && existing.status !== 'DRAFT') {
        continue;
      }

      const calculatedAt = new Date();

      const result = existing
        ? await this.prisma.learnerResult.update({
            where: { id: existing.id },
            data: {
              finalScore: calculation.finalScore,
              grade: graded.grade,
              descriptor: graded.descriptor,
              achievementLevel: graded.achievementLevel,
              calculatedAt,
              schemeVersionId: assessment.schemeVersionId,
              gradingSchemeVersionId,
            },
          })
        : await this.prisma.learnerResult.create({
            data: {
              schoolId: assessment.schoolId,
              academicYearId: assessment.academicYearId,
              termId: assessment.termId,
              assessmentId: assessment.id,
              enrollmentId,
              subjectId: assessment.subjectId,
              finalScore: calculation.finalScore,
              grade: graded.grade,
              descriptor: graded.descriptor,
              achievementLevel: graded.achievementLevel,
              status: 'DRAFT',
              calculatedAt,
              schemeVersionId: assessment.schemeVersionId,
              gradingSchemeVersionId,
            },
          });

      results.push(await this.buildResult(result));
    }

    return results;
  }

  async buildResult(result: {
    id: string;
    finalScore: Prisma.Decimal | number | null;
    grade: string | null;
    descriptor: string | null;
    achievementLevel: string | null;
    status: string;
    calculatedAt: Date | null;
    amendedAt: Date | null;
    assessmentId: string;
    enrollmentId: string;
    subjectId: string;
    schoolId: string;
    academicYearId: string;
    termId: string | null;
    schemeVersionId: string | null;
    gradingSchemeVersionId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<LearnerResultResponse> {
    const amendments = await this.prisma.resultAmendment.findMany({
      where: { resultId: result.id },
      orderBy: { amendedAt: 'asc' },
    });

    return {
      id: result.id,
      finalScore: result.finalScore === null ? null : Number(result.finalScore),
      grade: result.grade,
      descriptor: result.descriptor,
      achievementLevel: result.achievementLevel,
      status: result.status as LearnerResultResponse['status'],
      calculatedAt: result.calculatedAt,
      amendedAt: result.amendedAt,
      assessmentId: result.assessmentId,
      enrollmentId: result.enrollmentId,
      subjectId: result.subjectId,
      schoolId: result.schoolId,
      academicYearId: result.academicYearId,
      termId: result.termId,
      schemeVersionId: result.schemeVersionId,
      gradingSchemeVersionId: result.gradingSchemeVersionId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      amendments: amendments.map((amendment): ResultAmendmentResponse => ({
        id: amendment.id,
        previousFinalScore:
          amendment.previousFinalScore === null
            ? null
            : Number(amendment.previousFinalScore),
        previousGrade: amendment.previousGrade,
        previousDescriptor: amendment.previousDescriptor,
        newFinalScore:
          amendment.newFinalScore === null ? null : Number(amendment.newFinalScore),
        newGrade: amendment.newGrade,
        newDescriptor: amendment.newDescriptor,
        reason: amendment.reason,
        amendedById: amendment.amendedById,
        amendedAt: amendment.amendedAt,
      })),
    };
  }
}