import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../identity/types/authenticated-request';
import { PrismaService } from '../../../database/prisma.service';
import type {
  LearnerResultResponse,
} from '../dto/assessments-response.dto';
import { ListResultsQueryDto } from '../dto/list-results-query.dto';
import { AmendResultDto, ResultActionDto } from '../dto/result-actions.dto';
import { ResultCalculatorService } from './result-calculator.service';
import { requireActiveSchoolId, requireTeacherAssignmentContext } from './assessment-context.util';

/**
 * Learner result lifecycle. Results move DRAFT -> SUBMITTED -> APPROVED ->
 * LOCKED, with AMENDED as the controlled correction of a finalized result.
 * Calculation produces drafts; every later step is explicit and traceable.
 */
@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: ResultCalculatorService,
  ) {}

  async generate(
    activeSchoolId: string | null,
    user: AuthenticatedUser,
    assessmentId: string,
  ): Promise<LearnerResultResponse[]> {
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

    return this.calculator.calculate(activeSchoolId, assessmentId);
  }

  async list(
    activeSchoolId: string | null,
    query: ListResultsQueryDto,
  ): Promise<LearnerResultResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const where: Record<string, unknown> = { schoolId };

    if (query.assessmentId !== undefined) {
      where.assessmentId = query.assessmentId;
    }

    if (query.subjectId !== undefined) {
      where.subjectId = query.subjectId;
    }

    if (query.academicYearId !== undefined) {
      where.academicYearId = query.academicYearId;
    }

    if (query.enrollmentId !== undefined) {
      where.enrollmentId = query.enrollmentId;
    }

    if (query.status !== undefined) {
      where.status = query.status;
    }

    const results = await this.prisma.learnerResult.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return Promise.all(results.map((result) => this.calculator.buildResult(result)));
  }

  async submit(
    activeSchoolId: string | null,
    user: AuthenticatedUser,
    dto: ResultActionDto,
  ): Promise<LearnerResultResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);
    await this.requireCanTransition(schoolId, user, dto.resultIds, ['DRAFT', 'SUBMITTED']);
    return this.transition(schoolId, dto.resultIds, 'SUBMITTED');
  }

  async approve(
    activeSchoolId: string | null,
    dto: ResultActionDto,
  ): Promise<LearnerResultResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);
    await this.requireResultsInSchool(schoolId, dto.resultIds);
    return this.transition(schoolId, dto.resultIds, 'APPROVED');
  }

  async lock(
    activeSchoolId: string | null,
    dto: ResultActionDto,
  ): Promise<LearnerResultResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);
    await this.requireResultsInSchool(schoolId, dto.resultIds);
    return this.transition(schoolId, dto.resultIds, 'LOCKED');
  }

  async amend(
    activeSchoolId: string | null,
    user: AuthenticatedUser,
    dto: AmendResultDto,
  ): Promise<LearnerResultResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const result = await this.prisma.learnerResult.findFirst({
      where: { id: dto.resultId, schoolId },
    });

    if (!result) {
      throw new NotFoundException('Learner result not found.');
    }

    if (!['APPROVED', 'LOCKED', 'AMENDED'].includes(result.status)) {
      throw new BadRequestException(
        'Only approved, locked or already-amended results can be amended.',
      );
    }

    const newFinalScore =
      dto.finalScore !== undefined ? dto.finalScore : result.finalScore === null ? null : Number(result.finalScore);
    const newGrade = dto.grade !== undefined ? dto.grade : result.grade;
    const newDescriptor =
      dto.descriptor !== undefined ? dto.descriptor : result.descriptor;
    const newAchievementLevel =
      dto.achievementLevel !== undefined
        ? dto.achievementLevel
        : result.achievementLevel;

    const hasChange =
      newFinalScore !== (result.finalScore === null ? null : Number(result.finalScore)) ||
      newGrade !== result.grade ||
      newDescriptor !== result.descriptor ||
      newAchievementLevel !== result.achievementLevel;

    if (!hasChange) {
      throw new BadRequestException('No change was provided for the amendment.');
    }

    await this.prisma.resultAmendment.create({
      data: {
        resultId: result.id,
        previousFinalScore: result.finalScore,
        previousGrade: result.grade,
        previousDescriptor: result.descriptor,
        newFinalScore: newFinalScore ?? null,
        newGrade: newGrade ?? null,
        newDescriptor: newDescriptor ?? null,
        reason: dto.reason,
        amendedById: user.id,
      },
    });

    const updated = await this.prisma.learnerResult.update({
      where: { id: result.id },
      data: {
        finalScore: newFinalScore ?? null,
        grade: newGrade ?? null,
        descriptor: newDescriptor ?? null,
        achievementLevel: newAchievementLevel ?? null,
        status: 'AMENDED',
        amendedAt: new Date(),
      },
    });

    return this.calculator.buildResult(updated);
  }

  private async requireCanTransition(
    schoolId: string,
    user: AuthenticatedUser,
    resultIds: string[],
    fromStatuses: string[],
  ): Promise<void> {
    const results = await this.prisma.learnerResult.findMany({
      where: { id: { in: resultIds }, schoolId },
      select: {
        id: true,
        status: true,
        assessmentId: true,
        academicYearId: true,
        subjectId: true,
      },
    });

    if (results.length !== new Set(resultIds).size) {
      throw new NotFoundException('One or more learner results were not found.');
    }

    const assessmentIds = [...new Set(results.map((result) => result.assessmentId))];

    const assessments =
      assessmentIds.length > 0
        ? await this.prisma.assessment.findMany({
            where: { id: { in: assessmentIds } },
            select: {
              id: true,
              schoolId: true,
              academicYearId: true,
              subjectId: true,
              academicClassId: true,
              streamId: true,
            },
          })
        : [];

    for (const assessment of assessments) {
      await requireTeacherAssignmentContext(this.prisma, user, assessment);
    }

    for (const result of results) {
      if (!fromStatuses.includes(result.status)) {
        throw new BadRequestException(
          `Result "${result.id}" is in status ${result.status} and cannot be transitioned.`,
        );
      }
    }
  }

  private async requireResultsInSchool(
    schoolId: string,
    resultIds: string[],
  ): Promise<void> {
    const results = await this.prisma.learnerResult.findMany({
      where: { id: { in: resultIds }, schoolId },
      select: { id: true, status: true },
    });

    if (results.length !== new Set(resultIds).size) {
      throw new NotFoundException('One or more learner results were not found.');
    }

    for (const result of results) {
      if (result.status !== 'SUBMITTED' && result.status !== 'APPROVED' && result.status !== 'LOCKED') {
        throw new BadRequestException(
          `Result "${result.id}" is in status ${result.status} and cannot be transitioned.`,
        );
      }
    }
  }

  private async transition(
    schoolId: string,
    resultIds: string[],
    toStatus: string,
  ): Promise<LearnerResultResponse[]> {
    const results = await this.prisma.learnerResult.findMany({
      where: { id: { in: resultIds }, schoolId },
    });

    const updated: LearnerResultResponse[] = [];

    for (const result of results) {
      if (result.status === toStatus) {
        updated.push(await this.calculator.buildResult(result));
        continue;
      }

      const record = await this.prisma.learnerResult.update({
        where: { id: result.id },
        data: { status: toStatus as never },
      });

      updated.push(await this.calculator.buildResult(record));
    }

    return updated;
  }
}