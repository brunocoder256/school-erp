import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateStudentSubjectDto } from '../dto/create-student-subject.dto';
import { ListStudentSubjectsQueryDto } from '../dto/list-student-subjects-query.dto';
import type { StudentSubjectResponse } from '../dto/student-subject-response.dto';
import { UpdateStudentSubjectDto } from '../dto/update-student-subject.dto';

const STUDENT_SUBJECT_SELECT = {
  id: true,
  isActive: true,
  enrollmentId: true,
  subjectId: true,
  createdAt: true,
  updatedAt: true,
};

type EnrollmentContext = {
  id: string;
  studentId: string;
  academicYearId: string;
  academicClassId: string;
  streamId: string | null;
};

/**
 * Student subject enrollment administration within the active school.
 *
 * A subject enrollment connects a student's academic enrollment to a subject.
 * The tenant relationship is studentSubjectEnrollment → enrollment → student →
 * activeSchoolId, verified on every operation (safe 404). The subject must be
 * offered at the enrollment's level/year and allocated to the enrollment's
 * class/stream. Subject enrollments are historical: deactivated, never
 * hard-deleted.
 */
@Injectable()
export class StudentSubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    enrollmentId: string,
    dto: CreateStudentSubjectDto,
  ): Promise<StudentSubjectResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    const enrollment = await this.requireEnrollmentInSchool(
      schoolId,
      enrollmentId,
    );
    await this.requireSubjectInSchool(schoolId, dto.subjectId);

    const offering = await this.requireOfferingForContext(
      schoolId,
      dto.subjectId,
      enrollment,
    );

    await this.requireAllocatedForContext(
      schoolId,
      enrollment,
      offering.id,
    );

    await this.requireNoDuplicate(enrollmentId, dto.subjectId);

    try {
      return await this.prisma.studentSubjectEnrollment.create({
        data: {
          enrollmentId,
          subjectId: dto.subjectId,
          isActive: true,
        },
        select: STUDENT_SUBJECT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'The student is already enrolled in this subject for the academic year.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Enrollment or subject not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async listByEnrollment(
    activeSchoolId: string | null,
    enrollmentId: string,
  ): Promise<StudentSubjectResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireEnrollmentInSchool(schoolId, enrollmentId);

    return this.prisma.studentSubjectEnrollment.findMany({
      where: { enrollmentId },
      select: STUDENT_SUBJECT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(
    activeSchoolId: string | null,
    enrollmentId: string,
    id: string,
    dto: UpdateStudentSubjectDto,
  ): Promise<StudentSubjectResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireEnrollmentInSchool(schoolId, enrollmentId);

    const existing = await this.prisma.studentSubjectEnrollment.findFirst({
      where: { id, enrollmentId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Student subject enrollment not found.');
    }

    const data: { isActive?: boolean } = {};

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.studentSubjectEnrollment.update({
        where: { id },
        data,
        select: STUDENT_SUBJECT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Student subject enrollment not found.');
      }

      throw error;
    }
  }

  /**
   * Lists subject enrollments across the active school. Supports "list
   * students taking a subject" with optional year/class/stream/enrollment
   * filters. Results are always scoped to the active school's students.
   */
  async list(
    activeSchoolId: string | null,
    query: ListStudentSubjectsQueryDto,
  ): Promise<StudentSubjectResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const where: Record<string, unknown> = {};

    if (query.subjectId !== undefined) {
      await this.requireSubjectInSchool(schoolId, query.subjectId);
      where.subjectId = query.subjectId;
    }

    if (query.academicYearId !== undefined) {
      await this.requireYearInSchool(schoolId, query.academicYearId);
    }

    if (query.academicClassId !== undefined) {
      await this.requireClassInSchool(schoolId, query.academicClassId);
    }

    if (query.streamId !== undefined) {
      await this.requireStreamInSchool(schoolId, query.streamId);
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.enrollmentId !== undefined) {
      await this.requireEnrollmentInSchool(schoolId, query.enrollmentId);
      where.enrollmentId = query.enrollmentId;
    } else {
      const enrollmentIds = await this.resolveSchoolEnrollmentIds(
        schoolId,
        query,
      );
      where.enrollmentId = { in: enrollmentIds };
    }

    return this.prisma.studentSubjectEnrollment.findMany({
      where,
      select: STUDENT_SUBJECT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  private async resolveSchoolEnrollmentIds(
    schoolId: string,
    query: ListStudentSubjectsQueryDto,
  ): Promise<string[]> {
    const students = await this.prisma.student.findMany({
      where: { schoolId },
      select: { id: true },
    });

    const enrollmentWhere: Record<string, unknown> = {
      studentId: { in: students.map((student) => student.id) },
    };

    if (query.academicYearId !== undefined) {
      enrollmentWhere.academicYearId = query.academicYearId;
    }

    if (query.academicClassId !== undefined) {
      enrollmentWhere.academicClassId = query.academicClassId;
    }

    if (query.streamId !== undefined) {
      enrollmentWhere.streamId = query.streamId;
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: enrollmentWhere,
      select: { id: true },
    });

    return enrollments.map((item) => item.id);
  }

  private async requireEnrollmentInSchool(
    schoolId: string,
    enrollmentId: string,
  ): Promise<EnrollmentContext> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId },
      select: {
        id: true,
        studentId: true,
        academicYearId: true,
        academicClassId: true,
        streamId: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    const student = await this.prisma.student.findFirst({
      where: { id: enrollment.studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Enrollment not found.');
    }

    return enrollment;
  }

  private async requireOfferingForContext(
    schoolId: string,
    subjectId: string,
    enrollment: EnrollmentContext,
  ): Promise<{ id: string }> {
    const academicClass = await this.prisma.academicClass.findFirst({
      where: { id: enrollment.academicClassId, schoolId },
      select: { id: true, academicLevelId: true },
    });

    if (!academicClass) {
      throw new NotFoundException('Academic class not found.');
    }

    const offering = await this.prisma.subjectOffering.findFirst({
      where: {
        schoolId,
        subjectId,
        academicYearId: enrollment.academicYearId,
        academicLevelId: academicClass.academicLevelId,
      },
      select: { id: true },
    });

    if (!offering) {
      throw new ConflictException(
        'The subject must be offered at this level for the academic year before a student can be enrolled in it.',
      );
    }

    return offering;
  }

  private async requireAllocatedForContext(
    schoolId: string,
    enrollment: EnrollmentContext,
    subjectOfferingId: string,
  ): Promise<void> {
    const allocation = await this.prisma.subjectAllocation.findFirst({
      where: {
        schoolId,
        academicYearId: enrollment.academicYearId,
        academicClassId: enrollment.academicClassId,
        streamId: enrollment.streamId,
        subjectOfferingId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!allocation) {
      throw new ConflictException(
        'The subject must be allocated to this student\'s class and stream for the academic year before they can be enrolled in it.',
      );
    }
  }

  private async requireNoDuplicate(
    enrollmentId: string,
    subjectId: string,
  ): Promise<void> {
    const existing = await this.prisma.studentSubjectEnrollment.findFirst({
      where: { enrollmentId, subjectId },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'The student is already enrolled in this subject for the academic year.',
      );
    }
  }

  private async requireSubjectInSchool(
    schoolId: string,
    subjectId: string,
  ): Promise<void> {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: { id: true },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found.');
    }
  }

  private async requireYearInSchool(
    schoolId: string,
    academicYearId: string,
  ): Promise<void> {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true },
    });

    if (!year) {
      throw new NotFoundException('Academic year not found.');
    }
  }

  private async requireClassInSchool(
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

  private async requireStreamInSchool(
    schoolId: string,
    streamId: string,
  ): Promise<void> {
    const stream = await this.prisma.stream.findFirst({
      where: { id: streamId },
      select: { id: true, classId: true },
    });

    if (!stream) {
      throw new NotFoundException('Stream not found.');
    }

    const academicClass = await this.prisma.academicClass.findFirst({
      where: { id: stream.classId, schoolId },
      select: { id: true },
    });

    if (!academicClass) {
      throw new NotFoundException('Stream not found.');
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
