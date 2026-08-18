import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { StaffStatus } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTeachingAssignmentDto } from '../dto/create-teaching-assignment.dto';
import type { TeachingAssignmentResponse } from '../dto/teaching-assignment-response.dto';
import { UpdateTeachingAssignmentDto } from '../dto/update-teaching-assignment.dto';

const TEACHING_ASSIGNMENT_SELECT = {
  id: true,
  staffId: true,
  academicYearId: true,
  subjectId: true,
  academicClassId: true,
  streamId: true,
  isActive: true,
  schoolId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Teaching assignment administration within the active school context.
 *
 * An assignment connects staff + academic year + subject + academic class +
 * optional stream. Every referenced entity must belong to the active school;
 * the stream must belong to the class. Only active staff can receive new
 * active assignments, but historical assignments survive status changes.
 * There is no hard delete — deactivate instead.
 */
@Injectable()
export class TeachingAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateTeachingAssignmentDto,
  ): Promise<TeachingAssignmentResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireActiveStaffInSchool(schoolId, dto.staffId);
    await this.requireAcademicYearInSchool(schoolId, dto.academicYearId);
    await this.requireSubjectInSchool(schoolId, dto.subjectId);
    await this.requireClassInSchool(schoolId, dto.academicClassId);

    if (dto.streamId) {
      await this.requireStreamInClass(dto.academicClassId, dto.streamId);
    }

    await this.requireNoDuplicate(
      schoolId,
      dto.staffId,
      dto.academicYearId,
      dto.subjectId,
      dto.academicClassId,
      dto.streamId ?? null,
    );

    try {
      return await this.prisma.teachingAssignment.create({
        data: {
          schoolId,
          staffId: dto.staffId,
          academicYearId: dto.academicYearId,
          subjectId: dto.subjectId,
          academicClassId: dto.academicClassId,
          streamId: dto.streamId ?? null,
          isActive: dto.isActive ?? true,
        },
        select: TEACHING_ASSIGNMENT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Staff member, academic year, subject, class or stream not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
  ): Promise<TeachingAssignmentResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    return this.prisma.teachingAssignment.findMany({
      where: { schoolId },
      select: TEACHING_ASSIGNMENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<TeachingAssignmentResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: { id, schoolId },
      select: TEACHING_ASSIGNMENT_SELECT,
    });

    if (!assignment) {
      throw new NotFoundException('Teaching assignment not found.');
    }

    return assignment;
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateTeachingAssignmentDto,
  ): Promise<TeachingAssignmentResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.teachingAssignment.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        staffId: true,
        academicYearId: true,
        subjectId: true,
        academicClassId: true,
        streamId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Teaching assignment not found.');
    }

    if (dto.isActive === true) {
      await this.requireActiveStaffInSchool(schoolId, existing.staffId);
    }

    const academicClassId = dto.academicClassId ?? existing.academicClassId;

    if (dto.academicClassId !== undefined) {
      await this.requireClassInSchool(schoolId, dto.academicClassId);
    }

    if (dto.streamId !== undefined && dto.streamId !== null) {
      await this.requireStreamInClass(academicClassId, dto.streamId);
    }

    if (dto.academicClassId !== undefined || dto.streamId !== undefined) {
      const newStreamId =
        dto.streamId !== undefined ? dto.streamId : existing.streamId;

      await this.requireNoDuplicate(
        schoolId,
        existing.staffId,
        existing.academicYearId,
        existing.subjectId,
        academicClassId,
        newStreamId,
      );
    }

    const data: {
      academicClassId?: string;
      streamId?: string | null;
      isActive?: boolean;
    } = {};

    if (dto.academicClassId !== undefined) {
      data.academicClassId = dto.academicClassId;
    }

    if (dto.streamId !== undefined) {
      data.streamId = dto.streamId;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.teachingAssignment.update({
        where: { id },
        data,
        select: TEACHING_ASSIGNMENT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Teaching assignment not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Staff member, academic year, subject, class or stream not found or no longer available.',
        );
      }

      throw error;
    }
  }

  private async requireNoDuplicate(
    schoolId: string,
    staffId: string,
    academicYearId: string,
    subjectId: string,
    academicClassId: string,
    streamId: string | null,
  ): Promise<void> {
    const existing = await this.prisma.teachingAssignment.findFirst({
      where: {
        schoolId,
        staffId,
        academicYearId,
        subjectId,
        academicClassId,
        streamId,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'This teaching assignment already exists for the school.',
      );
    }
  }

  /**
   * Verifies the staff member belongs to the active school and is active.
   * Only active staff may receive new active assignments, but existing
   * (historical) assignments are never modified or destroyed by status changes.
   */
  private async requireActiveStaffInSchool(
    schoolId: string,
    staffId: string,
  ): Promise<void> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, schoolId },
      select: { id: true, employmentStatus: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found.');
    }

    if (staff.employmentStatus !== StaffStatus.ACTIVE) {
      throw new ConflictException(
        'An inactive staff member cannot receive new active teaching assignments.',
      );
    }
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

  private requireActiveSchoolId(activeSchoolId: string | null): string {
    if (!activeSchoolId) {
      throw new ForbiddenException(
        'Active school context is required for this operation.',
      );
    }

    return activeSchoolId;
  }
}