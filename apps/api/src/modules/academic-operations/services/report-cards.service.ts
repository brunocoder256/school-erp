import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { ReportCardStatus } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateReportCardDto,
  ReportCardLineDto,
} from '../dto/report-card-line.dto';
import { ListReportCardsQueryDto } from '../dto/list-report-cards-query.dto';
import type { ReportCardResponse } from '../dto/report-card-response.dto';

const REPORT_CARD_SELECT = {
  id: true,
  schoolId: true,
  studentId: true,
  enrollmentId: true,
  academicYearId: true,
  academicClassId: true,
  streamId: true,
  averageScore: true,
  overallGrade: true,
  status: true,
  remarks: true,
  generatedAt: true,
  submittedAt: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  lines: {
    select: {
      id: true,
      reportCardId: true,
      subjectId: true,
      score: true,
      grade: true,
      isPassed: true,
      teacherComment: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

@Injectable()
export class ReportCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateReportCardDto,
  ): Promise<ReportCardResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    const enrollment = await this.requireEnrollmentInSchool(schoolId, dto.enrollmentId);

    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('At least one subject result is required.');
    }

    const existing = await this.prisma.reportCard.findFirst({
      where: {
        schoolId,
        enrollmentId: dto.enrollmentId,
        academicYearId: enrollment.academicYearId,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A report card already exists for this enrollment and academic year.',
      );
    }

    const normalizedLines = await this.normalizeSubjectLines(
      schoolId,
      dto.lines,
      enrollment.academicYearId,
    );

    const averageScore = this.calculateAverage(normalizedLines);
    const overallGrade = this.calculateOverallGrade(averageScore);
    const status = dto.status ?? ReportCardStatus.DRAFT;

    try {
      const reportCard = await this.prisma.reportCard.create({
        data: {
          schoolId,
          studentId: enrollment.studentId,
          enrollmentId: dto.enrollmentId,
          academicYearId: enrollment.academicYearId,
          academicClassId: enrollment.academicClassId,
          streamId: enrollment.streamId,
          averageScore,
          overallGrade,
          status,
          remarks: dto.remarks ?? null,
          generatedAt: new Date(),
          submittedAt: status === ReportCardStatus.SUBMITTED ? new Date() : null,
          approvedAt: status === ReportCardStatus.APPROVED ? new Date() : null,
          lines: {
            createMany: {
              data: normalizedLines.map((line) => ({
                subjectId: line.subjectId,
                score: line.score,
                grade: line.grade,
                isPassed: line.isPassed,
                teacherComment: line.teacherComment ?? null,
              })),
            },
          },
        },
        select: REPORT_CARD_SELECT,
      });

      return reportCard as ReportCardResponse;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A report card already exists for this enrollment and academic year.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    query: ListReportCardsQueryDto,
  ): Promise<ReportCardResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const where: Record<string, unknown> = { schoolId };

    if (query.studentId) {
      await this.requireStudentInSchool(schoolId, query.studentId);
      where.studentId = query.studentId;
    }

    if (query.enrollmentId) {
      await this.requireEnrollmentInSchool(schoolId, query.enrollmentId);
      where.enrollmentId = query.enrollmentId;
    }

    if (query.academicYearId) {
      await this.requireAcademicYearInSchool(schoolId, query.academicYearId);
      where.academicYearId = query.academicYearId;
    }

    if (query.academicClassId) {
      await this.requireClassInSchool(schoolId, query.academicClassId);
      where.academicClassId = query.academicClassId;
    }

    if (query.streamId) {
      await this.requireStreamInSchool(schoolId, query.streamId);
      where.streamId = query.streamId;
    }

    if (query.isApproved !== undefined) {
      where.status = query.isApproved ? ReportCardStatus.APPROVED : { not: ReportCardStatus.APPROVED };
    }

    const cards = await this.prisma.reportCard.findMany({
      where,
      select: REPORT_CARD_SELECT,
      orderBy: { generatedAt: 'desc' },
    });

    return cards as ReportCardResponse[];
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<ReportCardResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id, schoolId },
      select: REPORT_CARD_SELECT,
    });

    if (!reportCard) {
      throw new NotFoundException('Report card not found.');
    }

    return reportCard as ReportCardResponse;
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: { status?: ReportCardStatus; remarks?: string; lines?: ReportCardLineDto[] },
  ): Promise<ReportCardResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.reportCard.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        enrollmentId: true,
        academicYearId: true,
        status: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Report card not found.');
    }

    const enrollment = await this.requireEnrollmentInSchool(schoolId, existing.enrollmentId);
    const data: {
      status?: ReportCardStatus;
      remarks?: string | null;
      submittedAt?: Date | null;
      approvedAt?: Date | null;
      averageScore?: number;
      overallGrade?: string;
    } = {};

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === ReportCardStatus.SUBMITTED) {
        data.submittedAt = new Date();
      }
      if (dto.status === ReportCardStatus.APPROVED) {
        data.approvedAt = new Date();
      }
    }

    if (dto.remarks !== undefined) {
      data.remarks = dto.remarks || null;
    }

    if (dto.lines !== undefined) {
      if (dto.lines.length === 0) {
        throw new BadRequestException('At least one subject result is required.');
      }

      const normalizedLines = await this.normalizeSubjectLines(
        schoolId,
        dto.lines,
        enrollment.academicYearId,
      );
      const averageScore = this.calculateAverage(normalizedLines);
      data.averageScore = averageScore;
      data.overallGrade = this.calculateOverallGrade(averageScore);

      await this.prisma.reportCardLine.deleteMany({ where: { reportCardId: id } });
      await this.prisma.reportCardLine.createMany({
        data: normalizedLines.map((line) => ({
          reportCardId: id,
          subjectId: line.subjectId,
          score: line.score,
          grade: line.grade,
          isPassed: line.isPassed,
          teacherComment: line.teacherComment ?? null,
        })),
      });
    }

    const updated = await this.prisma.reportCard.update({
      where: { id },
      data,
      select: REPORT_CARD_SELECT,
    });

    return updated as ReportCardResponse;
  }

  async approve(
    activeSchoolId: string | null,
    id: string,
  ): Promise<ReportCardResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!reportCard) {
      throw new NotFoundException('Report card not found.');
    }

    if (!reportCard.status || reportCard.status === ReportCardStatus.DRAFT) {
      await this.prisma.reportCard.update({
        where: { id },
        data: {
          status: ReportCardStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });
    }

    const approved = await this.prisma.reportCard.update({
      where: { id },
      data: {
        status: ReportCardStatus.APPROVED,
        approvedAt: new Date(),
      },
      select: REPORT_CARD_SELECT,
    });

    return approved as ReportCardResponse;
  }

  async getTranscript(
    activeSchoolId: string | null,
    studentId: string,
  ): Promise<any> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStudentInSchool(schoolId, studentId);

    const cards = await this.prisma.reportCard.findMany({
      where: { schoolId, studentId },
      include: {
        academicYear: { select: { id: true, name: true, startDate: true, endDate: true } },
        academicClass: { select: { id: true, name: true, code: true } },
        stream: { select: { id: true, name: true, code: true } },
        lines: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
          },
          orderBy: { subjectId: 'asc' },
        },
      },
      orderBy: { generatedAt: 'asc' },
    });

    return {
      studentId,
      schoolId,
      transcript: cards.map((card) => ({
        id: card.id,
        academicYear: card.academicYear,
        academicClass: card.academicClass,
        stream: card.stream,
        averageScore: card.averageScore,
        overallGrade: card.overallGrade,
        status: card.status,
        lines: card.lines.map((line) => ({
          subject: line.subject,
          score: line.score,
          grade: line.grade,
          isPassed: line.isPassed,
          teacherComment: line.teacherComment,
        })),
      })),
    };
  }

  private async normalizeSubjectLines(
    schoolId: string,
    lines: ReportCardLineDto[],
    academicYearId: string,
  ) {
    const normalized = lines.map((line) => ({
      subjectId: line.subjectId,
      score: Number(line.score),
      grade: line.grade ?? this.calculateOverallGrade(Number(line.score)),
      isPassed: line.isPassed ?? Number(line.score) >= 40,
      teacherComment: line.teacherComment ?? null,
    }));

    const subjectIds = normalized.map((line) => line.subjectId);
    const validSubjects = await this.prisma.subject.findMany({
      where: { schoolId, id: { in: subjectIds } },
      select: { id: true },
    });

    const validIds = new Set(validSubjects.map((s) => s.id));
    const invalid = normalized.filter((line) => !validIds.has(line.subjectId));

    if (invalid.length > 0) {
      throw new NotFoundException('One or more subjects do not belong to this school.');
    }

    for (const line of normalized) {
      const subjectOffering = await this.prisma.subjectOffering.findFirst({
        where: {
          schoolId,
          subjectId: line.subjectId,
          academicYearId,
        },
        select: { id: true },
      });

      if (!subjectOffering) {
        throw new BadRequestException(
          'A subject included in the report card must be offered for the academic year.',
        );
      }
    }

    return normalized;
  }

  private calculateAverage(
    lines: Array<{ score: number; grade: string; isPassed: boolean }>,
  ): number {
    if (lines.length === 0) {
      return 0;
    }

    return Number(
      (lines.reduce((sum, item) => sum + item.score, 0) / lines.length).toFixed(2),
    );
  }

  private calculateOverallGrade(score: number): string {
    if (score >= 80) {
      return 'A';
    }
    if (score >= 70) {
      return 'B';
    }
    if (score >= 60) {
      return 'C';
    }
    if (score >= 50) {
      return 'D';
    }
    if (score >= 40) {
      return 'E';
    }
    return 'F';
  }

  private requireActiveSchoolId(activeSchoolId: string | null): string {
    if (!activeSchoolId) {
      throw new ForbiddenException(
        'Active school context is required for this operation.',
      );
    }

    return activeSchoolId;
  }

  private async requireEnrollmentInSchool(schoolId: string, enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId },
      select: {
        id: true,
        studentId: true,
        academicYearId: true,
        academicClassId: true,
        streamId: true,
        student: { select: { schoolId: true } },
      },
    });

    if (!enrollment || enrollment.student.schoolId !== schoolId) {
      throw new NotFoundException('Enrollment not found.');
    }

    return enrollment;
  }

  private async requireStudentInSchool(schoolId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    return student;
  }

  private async requireAcademicYearInSchool(schoolId: string, academicYearId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true },
    });

    if (!year) {
      throw new NotFoundException('Academic year not found.');
    }

    return year;
  }

  private async requireClassInSchool(schoolId: string, academicClassId: string) {
    const academicClass = await this.prisma.academicClass.findFirst({
      where: { id: academicClassId, schoolId },
      select: { id: true },
    });

    if (!academicClass) {
      throw new NotFoundException('Academic class not found.');
    }

    return academicClass;
  }

  private async requireStreamInSchool(schoolId: string, streamId: string) {
    const stream = await this.prisma.stream.findFirst({
      where: { id: streamId },
      include: { class: { select: { schoolId: true } } },
    });

    if (!stream || stream.class.schoolId !== schoolId) {
      throw new NotFoundException('Stream not found.');
    }

    return stream;
  }
}
