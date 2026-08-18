import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  AdmissionType,
  BoardingStatus,
  EnrollmentStatus,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import type { EnrollmentResponse } from '../dto/enrollment-response.dto';
import { CreateEnrollmentDto } from '../dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from '../dto/update-enrollment.dto';

const ENROLLMENT_SELECT = {
  id: true,
  studentId: true,
  academicYearId: true,
  academicClassId: true,
  streamId: true,
  status: true,
  enrollmentDate: true,
  admissionType: true,
  previousSchool: true,
  previousClass: true,
  boardingStatus: true,
  house: true,
  remarks: true,
  withdrawalDate: true,
  withdrawalReason: true,
  completedDate: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Enrollment administration within the active school context.
 *
 * Enrollments have no school column — the tenant relationship is
 * enrollment → student → activeSchoolId. Every operation first verifies the
 * parent student belongs to the authenticated active school, then scopes the
 * enrollment query to that student. An enrollment under a student of another
 * school is reported as not found (safe 404).
 */
@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    studentId: string,
    dto: CreateEnrollmentDto,
  ): Promise<EnrollmentResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStudentInSchool(schoolId, studentId);
    await this.requireAcademicYearInSchool(schoolId, dto.academicYearId);
    await this.requireAcademicClassInSchool(schoolId, dto.academicClassId);

    if (dto.streamId) {
      await this.requireStreamInClass(dto.academicClassId, dto.streamId);
    }

    const existing = await this.prisma.enrollment.findFirst({
      where: { studentId, academicYearId: dto.academicYearId },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'This student is already enrolled for the academic year.',
      );
    }

    try {
      return await this.prisma.enrollment.create({
        data: {
          studentId,
          academicYearId: dto.academicYearId,
          academicClassId: dto.academicClassId,
          streamId: dto.streamId ?? null,
          status: dto.status ?? EnrollmentStatus.PENDING,
          enrollmentDate: dto.enrollmentDate,
          admissionType: dto.admissionType ?? AdmissionType.NEW,
          previousSchool: dto.previousSchool?.trim() || null,
          previousClass: dto.previousClass?.trim() || null,
          boardingStatus: dto.boardingStatus ?? null,
          house: dto.house?.trim() || null,
          remarks: dto.remarks?.trim() || null,
        },
        select: ENROLLMENT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This student is already enrolled for the academic year.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Academic year, class or stream not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    studentId: string,
  ): Promise<EnrollmentResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStudentInSchool(schoolId, studentId);

    return this.prisma.enrollment.findMany({
      where: { studentId },
      select: ENROLLMENT_SELECT,
      orderBy: { enrollmentDate: 'desc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    enrollmentId: string,
  ): Promise<EnrollmentResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, student: { schoolId } },
      select: ENROLLMENT_SELECT,
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    return enrollment;
  }

  async update(
    activeSchoolId: string | null,
    enrollmentId: string,
    dto: UpdateEnrollmentDto,
  ): Promise<EnrollmentResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, student: { schoolId } },
      select: { id: true, academicClassId: true },
    });

    if (!existing) {
      throw new NotFoundException('Enrollment not found.');
    }

    const academicClassId = dto.academicClassId ?? existing.academicClassId;

    if (dto.academicClassId !== undefined) {
      await this.requireAcademicClassInSchool(schoolId, dto.academicClassId);
    }

    if (dto.streamId !== undefined && dto.streamId !== null) {
      await this.requireStreamInClass(academicClassId, dto.streamId);
    }

    const data: {
      status?: EnrollmentStatus;
      enrollmentDate?: string;
      admissionType?: AdmissionType;
      academicClassId?: string;
      streamId?: string | null;
      previousSchool?: string | null;
      previousClass?: string | null;
      boardingStatus?: BoardingStatus | null;
      house?: string | null;
      remarks?: string | null;
      withdrawalDate?: string | null;
      withdrawalReason?: string | null;
      completedDate?: string | null;
    } = {};

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (dto.enrollmentDate !== undefined) {
      data.enrollmentDate = dto.enrollmentDate;
    }

    if (dto.admissionType !== undefined) {
      data.admissionType = dto.admissionType;
    }

    if (dto.academicClassId !== undefined) {
      data.academicClassId = dto.academicClassId;
    }

    if (dto.streamId !== undefined) {
      data.streamId = dto.streamId;
    }

    if (dto.previousSchool !== undefined) {
      data.previousSchool = dto.previousSchool?.trim() || null;
    }

    if (dto.previousClass !== undefined) {
      data.previousClass = dto.previousClass?.trim() || null;
    }

    if (dto.boardingStatus !== undefined) {
      data.boardingStatus = dto.boardingStatus;
    }

    if (dto.house !== undefined) {
      data.house = dto.house?.trim() || null;
    }

    if (dto.remarks !== undefined) {
      data.remarks = dto.remarks?.trim() || null;
    }

    if (dto.withdrawalDate !== undefined) {
      data.withdrawalDate = dto.withdrawalDate;
    }

    if (dto.withdrawalReason !== undefined) {
      data.withdrawalReason = dto.withdrawalReason?.trim() || null;
    }

    if (dto.completedDate !== undefined) {
      data.completedDate = dto.completedDate;
    }

    try {
      return await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data,
        select: ENROLLMENT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Academic year, class or stream not found or no longer available.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Enrollment not found.');
      }

      throw error;
    }
  }

  /**
   * Verifies the parent student belongs to the active school before any
   * enrollment-level query runs. Cross-school students are indistinguishable
   * from nonexistent ones (safe 404).
   */
  private async requireStudentInSchool(
    schoolId: string,
    studentId: string,
  ): Promise<void> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found.');
    }
  }

  private async requireAcademicYearInSchool(
    schoolId: string,
    academicYearId: string,
  ): Promise<void> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found.');
    }
  }

  private async requireAcademicClassInSchool(
    schoolId: string,
    academicClassId: string,
  ): Promise<void> {
    const academicClass = await this.prisma.academicClass.findFirst({
      where: { id: academicClassId, schoolId },
      select: { id: true },
    });

    if (!academicClass) {
      throw new NotFoundException('Academic class not found.');
    }
  }

  private async requireStreamInClass(
    classId: string,
    streamId: string,
  ): Promise<void> {
    const stream = await this.prisma.stream.findFirst({
      where: { id: streamId, classId },
      select: { id: true },
    });

    if (!stream) {
      throw new BadRequestException(
        'The specified stream does not belong to the specified class.',
      );
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
}
