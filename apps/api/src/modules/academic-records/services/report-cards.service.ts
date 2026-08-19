import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../identity/types/authenticated-request';
import { PrismaService } from '../../../database/prisma.service';
import { requireActiveSchoolId } from '../../assessments/services/assessment-context.util';
import { ListReportCardsQueryDto } from '../dto/report-cards-query.dto';
import {
  AddReportCommentDto,
  AmendReportCardDto,
  GenerateReportCardDto,
} from '../dto/report-cards-action.dto';
import type {
  ReportCardAmendmentResponse,
  ReportCardCommentResponse,
  ReportCardResponse,
  ReportCardSubjectEntryResponse,
} from '../dto/academic-records-response.dto';

/** Only finalized M12 results become official report-card entries (M13 §8). */
const FINALIZED_RESULT_STATUSES = ['APPROVED', 'LOCKED', 'AMENDED'];

/**
 * Report-card lifecycle: DRAFT → GENERATED → APPROVED → ISSUED, with AMENDED
 * as the controlled correction of an issued report. M13 consumes finalized M12
 * LearnerResults and freezes them into a snapshot so later changes to grading,
 * enrollment or templates do not silently rewrite the historical report.
 */
@Injectable()
export class ReportCardsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a report card from finalized M12 results. The academic context
   * (class, stream, level, section) is resolved from the student's enrollment
   * for the given academic year. Each finalized result is snapshotted into an
   * immutable subject entry — missing data is never coerced to zero (M13 §29).
   */
  async generate(
    activeSchoolId: string | null,
    user: AuthenticatedUser,
    dto: GenerateReportCardDto,
  ): Promise<ReportCardResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this school.');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId: dto.studentId, academicYearId: dto.academicYearId },
      select: {
        id: true,
        academicClassId: true,
        streamId: true,
        academicClass: {
          select: {
            id: true,
            academicLevelId: true,
            academicLevel: {
              select: { id: true, sectionId: true },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(
        'No enrollment found for this student in the given academic year.',
      );
    }

    if (dto.templateVersionId) {
      const templateVersion = await this.prisma.reportTemplateVersion.findFirst({
        where: {
          id: dto.templateVersionId,
          template: { schoolId },
        },
        select: { id: true },
      });

      if (!templateVersion) {
        throw new NotFoundException(
          'Report template version not found in this school.',
        );
      }
    }

    // Prevent duplicate active reports for the same context (M13 §10).
    const existing = await this.prisma.reportCard.findFirst({
      where: {
        schoolId,
        studentId: dto.studentId,
        academicYearId: dto.academicYearId,
        termId: dto.termId ?? null,
      },
      select: { id: true, status: true },
    });

    if (existing) {
      throw new BadRequestException(
        `A report card already exists for this student/year/term in status ${existing.status}.`,
      );
    }

    // Fetch finalized M12 results scoped to the student's enrollment (M13 §8).
    const resultWhere: Record<string, unknown> = {
      schoolId,
      enrollment: { studentId: dto.studentId },
      academicYearId: dto.academicYearId,
      status: { in: FINALIZED_RESULT_STATUSES },
    };

    if (dto.termId) {
      resultWhere.termId = dto.termId;
    }

    const results = await this.prisma.learnerResult.findMany({
      where: resultWhere,
      include: {
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return this.prisma.$transaction(async (tx) => {
      const reportCard = await tx.reportCard.create({
        data: {
          schoolId,
          studentId: dto.studentId,
          academicYearId: dto.academicYearId,
          termId: dto.termId ?? null,
          academicClassId: enrollment.academicClassId,
          streamId: enrollment.streamId,
          academicLevelId: enrollment.academicClass?.academicLevelId ?? null,
          educationSectionId:
            enrollment.academicClass?.academicLevel?.sectionId ?? null,
          enrollmentId: enrollment.id,
          templateVersionId: dto.templateVersionId ?? null,
          status: 'GENERATED',
          generatedAt: new Date(),
          generatedById: user.id,
          version: 1,
        },
      });

      // Snapshot each finalized result — never coerce nulls to zero (M13 §29).
      if (results.length > 0) {
        await tx.reportCardSubjectEntry.createMany({
          data: results.map((result) => ({
            reportCardId: reportCard.id,
            subjectId: result.subjectId,
            subjectName: result.subject?.name ?? 'Unknown',
            subjectCode: result.subject?.code ?? 'UNKNOWN',
            finalScore: result.finalScore,
            grade: result.grade,
            descriptor: result.descriptor,
            achievementLevel: result.achievementLevel,
            resultStatus: result.status,
            learnerResultId: result.id,
          })),
        });
      }

      const created = await tx.reportCard.findFirst({
        where: { id: reportCard.id },
        include: {
          subjectEntries: { orderBy: { createdAt: 'asc' } },
          comments: { orderBy: { createdAt: 'asc' } },
          amendments: { orderBy: { amendedAt: 'asc' } },
        },
      });

      return this.buildResponse(created!);
    });
  }

  async list(
    activeSchoolId: string | null,
    query: ListReportCardsQueryDto,
  ): Promise<ReportCardResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const where: Record<string, unknown> = { schoolId };

    if (query.studentId !== undefined) {
      where.studentId = query.studentId;
    }

    if (query.academicYearId !== undefined) {
      where.academicYearId = query.academicYearId;
    }

    if (query.termId !== undefined) {
      where.termId = query.termId;
    }

    if (query.status !== undefined) {
      where.status = query.status;
    }

    const reportCards = await this.prisma.reportCard.findMany({
      where,
      include: {
        subjectEntries: { orderBy: { createdAt: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
        amendments: { orderBy: { amendedAt: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return reportCards.map((reportCard) => this.buildResponse(reportCard));
  }

  async findOne(
    activeSchoolId: string | null,
    reportId: string,
  ): Promise<ReportCardResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id: reportId, schoolId },
      include: {
        subjectEntries: { orderBy: { createdAt: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
        amendments: { orderBy: { amendedAt: 'asc' } },
      },
    });

    if (!reportCard) {
      throw new NotFoundException('Report card not found.');
    }

    return this.buildResponse(reportCard);
  }

  async approve(
    activeSchoolId: string | null,
    user: AuthenticatedUser,
    reportId: string,
  ): Promise<ReportCardResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id: reportId, schoolId },
    });

    if (!reportCard) {
      throw new NotFoundException('Report card not found.');
    }

    if (reportCard.status !== 'GENERATED') {
      throw new BadRequestException(
        `Report card is in status ${reportCard.status} and cannot be approved.`,
      );
    }

    const updated = await this.prisma.reportCard.update({
      where: { id: reportId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: user.id,
      },
      include: {
        subjectEntries: { orderBy: { createdAt: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
        amendments: { orderBy: { amendedAt: 'asc' } },
      },
    });

    return this.buildResponse(updated);
  }

  async issue(
    activeSchoolId: string | null,
    user: AuthenticatedUser,
    reportId: string,
  ): Promise<ReportCardResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id: reportId, schoolId },
    });

    if (!reportCard) {
      throw new NotFoundException('Report card not found.');
    }

    if (reportCard.status !== 'APPROVED') {
      throw new BadRequestException(
        `Report card is in status ${reportCard.status} and cannot be issued.`,
      );
    }

    const updated = await this.prisma.reportCard.update({
      where: { id: reportId },
      data: {
        status: 'ISSUED',
        issuedAt: new Date(),
        issuedById: user.id,
      },
      include: {
        subjectEntries: { orderBy: { createdAt: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
        amendments: { orderBy: { amendedAt: 'asc' } },
      },
    });

    return this.buildResponse(updated);
  }

  /**
   * Amend an issued report card. A ReportCardAmendment preserves the previous
   * and new statuses, the actor, the reason and the timestamp. The original
   * recommendation is never silently overwritten (M13 §10, §19, §26).
   */
  async amend(
    activeSchoolId: string | null,
    user: AuthenticatedUser,
    reportId: string,
    dto: AmendReportCardDto,
  ): Promise<ReportCardResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id: reportId, schoolId },
    });

    if (!reportCard) {
      throw new NotFoundException('Report card not found.');
    }

    if (reportCard.status !== 'ISSUED' && reportCard.status !== 'AMENDED') {
      throw new BadRequestException(
        `Report card is in status ${reportCard.status} and cannot be amended. Only issued or already-amended reports can be amended.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.reportCardAmendment.create({
        data: {
          reportCardId: reportId,
          previousStatus: reportCard.status,
          newStatus: 'AMENDED',
          reason: dto.reason,
          amendedById: user.id,
        },
      });

      const updated = await tx.reportCard.update({
        where: { id: reportId },
        data: {
          status: 'AMENDED',
          amendedAt: new Date(),
          amendedById: user.id,
          amendmentReason: dto.reason,
          version: { increment: 1 },
        },
        include: {
          subjectEntries: { orderBy: { createdAt: 'asc' } },
          comments: { orderBy: { createdAt: 'asc' } },
          amendments: { orderBy: { amendedAt: 'asc' } },
        },
      });

      return this.buildResponse(updated);
    });
  }

  /**
   * Attach a teacher, class-teacher or head-teacher comment to a report card.
   * Comments belong to the correct report and remain historically preserved
   * after issue (M13 §12).
   */
  async addComment(
    activeSchoolId: string | null,
    user: AuthenticatedUser,
    reportId: string,
    dto: AddReportCommentDto,
  ): Promise<ReportCardCommentResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id: reportId, schoolId },
      select: { id: true, status: true },
    });

    if (!reportCard) {
      throw new NotFoundException('Report card not found.');
    }

    if (reportCard.status === 'DRAFT') {
      throw new BadRequestException(
        'Comments cannot be added to a draft report card. Generate the report first.',
      );
    }

    if (
      dto.authorType === 'SUBJECT_TEACHER' &&
      !dto.subjectId
    ) {
      throw new BadRequestException(
        'A subject ID is required for subject-teacher comments.',
      );
    }

    const comment = await this.prisma.reportCardComment.create({
      data: {
        reportCardId: reportId,
        authorType: dto.authorType,
        subjectId: dto.subjectId ?? null,
        comment: dto.comment,
        authoredById: user.id,
      },
    });

    return this.buildCommentResponse(comment);
  }

  // -------------------------------------------------------------------------

  private buildResponse(reportCard: any): ReportCardResponse {
    return {
      id: reportCard.id,
      version: reportCard.version,
      status: reportCard.status,
      generatedAt: reportCard.generatedAt,
      approvedAt: reportCard.approvedAt,
      issuedAt: reportCard.issuedAt,
      amendedAt: reportCard.amendedAt,
      amendmentReason: reportCard.amendmentReason,
      schoolId: reportCard.schoolId,
      studentId: reportCard.studentId,
      academicYearId: reportCard.academicYearId,
      termId: reportCard.termId,
      academicClassId: reportCard.academicClassId,
      streamId: reportCard.streamId,
      academicLevelId: reportCard.academicLevelId,
      educationSectionId: reportCard.educationSectionId,
      enrollmentId: reportCard.enrollmentId,
      templateVersionId: reportCard.templateVersionId,
      generatedById: reportCard.generatedById,
      approvedById: reportCard.approvedById,
      issuedById: reportCard.issuedById,
      amendedById: reportCard.amendedById,
      createdAt: reportCard.createdAt,
      updatedAt: reportCard.updatedAt,
      subjectEntries: (reportCard.subjectEntries ?? []).map((entry: any) =>
        this.buildSubjectEntryResponse(entry),
      ),
      comments: (reportCard.comments ?? []).map((comment: any) =>
        this.buildCommentResponse(comment),
      ),
      amendments: (reportCard.amendments ?? []).map((amendment: any) =>
        this.buildAmendmentResponse(amendment),
      ),
    };
  }

  private buildSubjectEntryResponse(entry: any): ReportCardSubjectEntryResponse {
    return {
      id: entry.id,
      subjectId: entry.subjectId,
      subjectName: entry.subjectName,
      subjectCode: entry.subjectCode,
      finalScore: entry.finalScore === null ? null : Number(entry.finalScore),
      grade: entry.grade,
      descriptor: entry.descriptor,
      achievementLevel: entry.achievementLevel,
      resultStatus: entry.resultStatus,
      learnerResultId: entry.learnerResultId,
      reportCardId: entry.reportCardId,
    };
  }

  private buildCommentResponse(comment: any): ReportCardCommentResponse {
    return {
      id: comment.id,
      authorType: comment.authorType,
      subjectId: comment.subjectId,
      comment: comment.comment,
      authoredById: comment.authoredById,
      reportCardId: comment.reportCardId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  private buildAmendmentResponse(
    amendment: any,
  ): ReportCardAmendmentResponse {
    return {
      id: amendment.id,
      previousStatus: amendment.previousStatus,
      newStatus: amendment.newStatus,
      reason: amendment.reason,
      amendedById: amendment.amendedById,
      amendedAt: amendment.amendedAt,
      reportCardId: amendment.reportCardId,
    };
  }
}
