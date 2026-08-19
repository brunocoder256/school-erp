import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EnrollmentStatus,
  ProgressionDecision,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { CreateStudentProgressionDto } from '../dto/create-student-progression.dto';
import { UpdateStudentProgressionDto } from '../dto/update-student-progression.dto';
import type { StudentProgressionResponse } from '../dto/student-progression-response.dto';

const STUDENT_PROGRESSION_SELECT = {
  id: true,
  schoolId: true,
  studentId: true,
  enrollmentId: true,
  academicYearId: true,
  reportCardId: true,
  decision: true,
  recommendation: true,
  effectiveDate: true,
  fromAcademicLevelId: true,
  toAcademicLevelId: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class StudentProgressionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateStudentProgressionDto,
  ): Promise<StudentProgressionResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const reportCard = await this.prisma.reportCard.findFirst({
      where: { id: dto.reportCardId, schoolId },
      select: {
        id: true,
        studentId: true,
        enrollmentId: true,
        academicYearId: true,
        averageScore: true,
        status: true,
        enrollment: {
          select: {
            academicClassId: true,
          },
        },
      },
    });

    if (!reportCard) {
      throw new NotFoundException('Report card not found.');
    }

    if (reportCard.status !== 'APPROVED') {
      throw new BadRequestException(
        'A progression decision can only be created from an approved report card.',
      );
    }

    const currentClass = await this.prisma.academicClass.findFirst({
      where: { id: reportCard.enrollment.academicClassId, schoolId },
      select: { academicLevelId: true },
    });

    if (!currentClass) {
      throw new NotFoundException('Current academic class not found.');
    }

    const existing = await this.prisma.studentAcademicProgression.findFirst({
      where: {
        schoolId,
        studentId: reportCard.studentId,
        enrollmentId: reportCard.enrollmentId,
        academicYearId: reportCard.academicYearId,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A progression decision already exists for this enrollment and academic year.',
      );
    }

    const decision =
      dto.decision ?? this.resolveDecision(reportCard.averageScore ?? 0);

    const nextLevel = await this.prisma.academicLevelProgression.findFirst({
      where: {
        schoolId,
        fromLevelId: currentClass.academicLevelId,
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
      select: { toLevelId: true },
    });

    const toAcademicLevelId = dto.toAcademicLevelId ?? nextLevel?.toLevelId ?? null;

    try {
      const progression = await this.prisma.studentAcademicProgression.create({
        data: {
          schoolId,
          studentId: reportCard.studentId,
          enrollmentId: reportCard.enrollmentId,
          academicYearId: reportCard.academicYearId,
          reportCardId: dto.reportCardId,
          fromAcademicLevelId: currentClass.academicLevelId,
          toAcademicLevelId,
          decision,
          recommendation: dto.recommendation ?? null,
          effectiveDate: dto.effectiveDate ?? new Date(),
        },
        select: STUDENT_PROGRESSION_SELECT,
      });

      await this.prisma.enrollment.update({
        where: { id: reportCard.enrollmentId },
        data: {
          status: this.mapDecisionToEnrollmentStatus(decision),
        },
      });

      return progression as StudentProgressionResponse;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A progression decision already exists for this enrollment and academic year.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    studentId?: string,
    academicYearId?: string,
  ): Promise<StudentProgressionResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    if (studentId) {
      await this.requireStudentInSchool(schoolId, studentId);
    }

    if (academicYearId) {
      await this.requireAcademicYearInSchool(schoolId, academicYearId);
    }

    const progressions = await this.prisma.studentAcademicProgression.findMany({
      where: {
        schoolId,
        ...(studentId ? { studentId } : {}),
        ...(academicYearId ? { academicYearId } : {}),
      },
      select: STUDENT_PROGRESSION_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return progressions as StudentProgressionResponse[];
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<StudentProgressionResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const progression = await this.prisma.studentAcademicProgression.findFirst({
      where: { id, schoolId },
      select: STUDENT_PROGRESSION_SELECT,
    });

    if (!progression) {
      throw new NotFoundException('Student progression record not found.');
    }

    return progression as StudentProgressionResponse;
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateStudentProgressionDto,
  ): Promise<StudentProgressionResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.studentAcademicProgression.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        enrollmentId: true,
        decision: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Student progression record not found.');
    }

    const data: {
      decision?: ProgressionDecision;
      recommendation?: string | null;
      effectiveDate?: Date | null;
      toAcademicLevelId?: string | null;
    } = {};

    if (dto.decision !== undefined) {
      data.decision = dto.decision;
    }

    if (dto.recommendation !== undefined) {
      data.recommendation = dto.recommendation || null;
    }

    if (dto.effectiveDate !== undefined) {
      data.effectiveDate = dto.effectiveDate;
    }

    if (dto.toAcademicLevelId !== undefined) {
      data.toAcademicLevelId = dto.toAcademicLevelId || null;
    }

    const updated = await this.prisma.studentAcademicProgression.update({
      where: { id },
      data,
      select: STUDENT_PROGRESSION_SELECT,
    });

    if (dto.decision !== undefined) {
      await this.prisma.enrollment.update({
        where: { id: existing.enrollmentId },
        data: {
          status: this.mapDecisionToEnrollmentStatus(dto.decision),
        },
      });
    }

    return updated as StudentProgressionResponse;
  }

  private resolveDecision(score: number): ProgressionDecision {
    if (score >= 50) {
      return ProgressionDecision.PROMOTE;
    }

    return ProgressionDecision.REPEAT;
  }

  private mapDecisionToEnrollmentStatus(
    decision: ProgressionDecision,
  ): EnrollmentStatus {
    switch (decision) {
      case ProgressionDecision.PROMOTE:
        return EnrollmentStatus.PROMOTED;
      case ProgressionDecision.REPEAT:
        return EnrollmentStatus.REPEATING;
      case ProgressionDecision.TRANSFER:
        return EnrollmentStatus.TRANSFERRED;
      case ProgressionDecision.COMPLETE:
        return EnrollmentStatus.COMPLETED;
      default:
        return EnrollmentStatus.ACTIVE;
    }
  }

  private requireActiveSchoolId(activeSchoolId: string | null): string {
    if (!activeSchoolId) {
      throw new ForbiddenException(
        'Active school context is required for this operation.',
      );
    }

    return activeSchoolId;
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
}
