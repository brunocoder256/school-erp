import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../identity/types/authenticated-request';
import { PrismaService } from '../../../database/prisma.service';
import type { AssessmentScoreResponse } from '../dto/assessments-response.dto';
import { SetAssessmentScoresDto } from '../dto/set-assessment-scores.dto';
import { requireActiveSchoolId, requireTeacherAssignmentContext } from './assessment-context.util';

/**
 * Component score entry for an assessment. Absent is not zero: an absent
 * learner has no score and is excluded from the calculation. Only a school
 * administrator or a teacher whose active teaching assignment matches the
 * assessment context may record scores.
 */
@Injectable()
export class AssessmentScoresService {
  constructor(private readonly prisma: PrismaService) {}

  async setScores(
    activeSchoolId: string | null,
    user: AuthenticatedUser,
    assessmentId: string,
    dto: SetAssessmentScoresDto,
  ): Promise<AssessmentScoreResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
      select: {
        id: true,
        schoolId: true,
        academicYearId: true,
        subjectId: true,
        academicClassId: true,
        streamId: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    await requireTeacherAssignmentContext(this.prisma, user, assessment);

    const componentIds = [...new Set(dto.entries.map((entry) => entry.componentId))];
    const enrollmentIds = [...new Set(dto.entries.map((entry) => entry.enrollmentId))];

    const components = await this.prisma.assessmentComponent.findMany({
      where: { assessmentId, id: { in: componentIds } },
    });

    const componentById = new Map(
      components.map((component) => [component.id, component]),
    );

    for (const componentId of componentIds) {
      if (!componentById.has(componentId)) {
        throw new BadRequestException(
          `Component "${componentId}" does not belong to this assessment.`,
        );
      }
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        id: { in: enrollmentIds },
        academicYearId: assessment.academicYearId,
        academicClassId: assessment.academicClassId,
        streamId: assessment.streamId ?? null,
      },
      select: { id: true },
    });

    const validEnrollmentIds = new Set(enrollments.map((enrollment) => enrollment.id));

    for (const enrollmentId of enrollmentIds) {
      if (!validEnrollmentIds.has(enrollmentId)) {
        throw new BadRequestException(
          `Enrollment "${enrollmentId}" does not belong to this assessment context.`,
        );
      }
    }

    const upserted: AssessmentScoreResponse[] = [];

    for (const entry of dto.entries) {
      const component = componentById.get(entry.componentId);

      if (!component) {
        throw new BadRequestException('Assessment component not found.');
      }

      const status = entry.status ?? 'PRESENT';

      if (status === 'PRESENT' && entry.score === undefined) {
        throw new BadRequestException(
          `A score is required for a present learner on component "${component.name}".`,
        );
      }

      if (entry.score !== undefined) {
        const maxScore = Number(component.maxScore);

        if (entry.score < 0 || entry.score > maxScore) {
          throw new BadRequestException(
            `Score for component "${component.name}" must be between 0 and ${maxScore}.`,
          );
        }
      }

      const record = await this.prisma.assessmentScore.upsert({
        where: {
          componentId_enrollmentId: {
            componentId: entry.componentId,
            enrollmentId: entry.enrollmentId,
          },
        },
        update: {
          score: entry.score ?? null,
          status,
          comment: entry.comment ?? null,
          recordedById: user.id,
        },
        create: {
          assessmentId,
          componentId: entry.componentId,
          enrollmentId: entry.enrollmentId,
          score: entry.score ?? null,
          status,
          comment: entry.comment ?? null,
          recordedById: user.id,
        },
      });

      upserted.push({
        id: record.id,
        assessmentId: record.assessmentId,
        componentId: record.componentId,
        enrollmentId: record.enrollmentId,
        score: record.score === null ? null : Number(record.score),
        status: record.status,
        comment: record.comment,
        recordedById: record.recordedById,
        recordedAt: record.recordedAt,
      });
    }

    return upserted;
  }

  async listScores(
    activeSchoolId: string | null,
    assessmentId: string,
  ): Promise<AssessmentScoreResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
      select: { id: true },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    const scores = await this.prisma.assessmentScore.findMany({
      where: { assessmentId },
      orderBy: { recordedAt: 'asc' },
    });

    return scores.map((score) => ({
      id: score.id,
      assessmentId: score.assessmentId,
      componentId: score.componentId,
      enrollmentId: score.enrollmentId,
      score: score.score === null ? null : Number(score.score),
      status: score.status,
      comment: score.comment,
      recordedById: score.recordedById,
      recordedAt: score.recordedAt,
    }));
  }
}