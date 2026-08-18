import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTeachingGroupDto } from '../dto/create-teaching-group.dto';
import { ListTeachingGroupsQueryDto } from '../dto/list-teaching-groups-query.dto';
import type {
  TeachingGroupResponse,
  TeachingGroupStudentResponse,
} from '../dto/teaching-group-response.dto';
import { UpdateTeachingGroupDto } from '../dto/update-teaching-group.dto';

const TEACHING_GROUP_SELECT = {
  id: true,
  name: true,
  isActive: true,
  schoolId: true,
  academicYearId: true,
  academicClassId: true,
  streamId: true,
  subjectId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Teaching group administration within the active school context.
 *
 * A group is the stable operational unit that future milestones (attendance,
 * timetable, assessment) will reference. Creation requires the subject to be
 * offered at the class level for the year and to be allocated to the exact
 * class/stream context. Groups are deactivated, never hard-deleted.
 */
@Injectable()
export class TeachingGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateTeachingGroupDto,
  ): Promise<TeachingGroupResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireYearInSchool(schoolId, dto.academicYearId);
    const academicClass = await this.requireClassInSchool(
      schoolId,
      dto.academicClassId,
    );
    await this.requireSubjectInSchool(schoolId, dto.subjectId);

    if (dto.streamId) {
      await this.requireStreamInClass(dto.academicClassId, dto.streamId);
    }

    const offering = await this.requireOfferingForContext(
      schoolId,
      dto.subjectId,
      dto.academicYearId,
      academicClass.academicLevelId,
    );

    await this.requireAllocatedForContext(
      schoolId,
      dto.academicYearId,
      dto.academicClassId,
      dto.streamId ?? null,
      offering.id,
    );

    await this.requireNoDuplicate(
      schoolId,
      dto.academicYearId,
      dto.academicClassId,
      dto.streamId ?? null,
      dto.subjectId,
    );

    try {
      return await this.prisma.teachingGroup.create({
        data: {
          schoolId,
          academicYearId: dto.academicYearId,
          academicClassId: dto.academicClassId,
          streamId: dto.streamId ?? null,
          subjectId: dto.subjectId,
          name: dto.name?.trim() || null,
          isActive: dto.isActive ?? true,
        },
        select: TEACHING_GROUP_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A teaching group already exists for that class, stream, subject and academic year.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Academic year, class, stream or subject not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    query: ListTeachingGroupsQueryDto,
  ): Promise<TeachingGroupResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const where: Record<string, unknown> = { schoolId };

    if (query.academicYearId !== undefined) {
      await this.requireYearInSchool(schoolId, query.academicYearId);
      where.academicYearId = query.academicYearId;
    }

    if (query.academicClassId !== undefined) {
      await this.requireClassInSchool(schoolId, query.academicClassId);
      where.academicClassId = query.academicClassId;
    }

    if (query.streamId !== undefined) {
      where.streamId = query.streamId;
    }

    if (query.subjectId !== undefined) {
      await this.requireSubjectInSchool(schoolId, query.subjectId);
      where.subjectId = query.subjectId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return this.prisma.teachingGroup.findMany({
      where,
      select: TEACHING_GROUP_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<TeachingGroupResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const group = await this.prisma.teachingGroup.findFirst({
      where: { id, schoolId },
      select: TEACHING_GROUP_SELECT,
    });

    if (!group) {
      throw new NotFoundException('Teaching group not found.');
    }

    return group;
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateTeachingGroupDto,
  ): Promise<TeachingGroupResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.teachingGroup.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Teaching group not found.');
    }

    const data: { name?: string | null; isActive?: boolean } = {};

    if (dto.name !== undefined) {
      data.name = dto.name?.trim() || null;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.teachingGroup.update({
        where: { id },
        data,
        select: TEACHING_GROUP_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Teaching group not found.');
      }

      throw error;
    }
  }

  /**
   * Resolves the students of a teaching group from the active enrollments of
   * the group's academic year / class (and stream, when set) context.
   */
  async students(
    activeSchoolId: string | null,
    id: string,
  ): Promise<TeachingGroupStudentResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const group = await this.prisma.teachingGroup.findFirst({
      where: { id, schoolId },
      select: { id: true, academicYearId: true, academicClassId: true, streamId: true },
    });

    if (!group) {
      throw new NotFoundException('Teaching group not found.');
    }

    const students = await this.prisma.student.findMany({
      where: { schoolId },
      select: { id: true },
    });

    const enrollmentWhere: Record<string, unknown> = {
      studentId: { in: students.map((student) => student.id) },
      academicYearId: group.academicYearId,
      academicClassId: group.academicClassId,
    };

    if (group.streamId) {
      enrollmentWhere.streamId = group.streamId;
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: enrollmentWhere,
      select: { id: true, studentId: true },
      orderBy: { createdAt: 'asc' },
    });

    const studentIds = enrollments.map((item) => item.studentId);

    const studentRows = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        preferredName: true,
        gender: true,
      },
    });

    const studentMap = new Map(studentRows.map((item) => [item.id, item]));

    return enrollments
      .map((enrollment) => {
        const student = studentMap.get(enrollment.studentId);
        if (!student) {
          return null;
        }

        return {
          enrollmentId: enrollment.id,
          student,
        };
      })
      .filter(
        (item): item is TeachingGroupStudentResponse => item !== null,
      );
  }

  private async requireOfferingForContext(
    schoolId: string,
    subjectId: string,
    academicYearId: string,
    academicLevelId: string,
  ): Promise<{ id: string }> {
    const offering = await this.prisma.subjectOffering.findFirst({
      where: { schoolId, subjectId, academicYearId, academicLevelId },
      select: { id: true },
    });

    if (!offering) {
      throw new ConflictException(
        'The subject must be offered at this level for the academic year before a teaching group can be created.',
      );
    }

    return offering;
  }

  private async requireAllocatedForContext(
    schoolId: string,
    academicYearId: string,
    academicClassId: string,
    streamId: string | null,
    subjectOfferingId: string,
  ): Promise<void> {
    const allocation = await this.prisma.subjectAllocation.findFirst({
      where: {
        schoolId,
        academicYearId,
        academicClassId,
        streamId,
        subjectOfferingId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!allocation) {
      throw new ConflictException(
        'The subject must be allocated to this class and stream for the academic year before a teaching group can be created.',
      );
    }
  }

  private async requireNoDuplicate(
    schoolId: string,
    academicYearId: string,
    academicClassId: string,
    streamId: string | null,
    subjectId: string,
  ): Promise<void> {
    const existing = await this.prisma.teachingGroup.findFirst({
      where: { schoolId, academicYearId, academicClassId, streamId, subjectId },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A teaching group already exists for that class, stream, subject and academic year.',
      );
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
  ): Promise<{ id: string; academicLevelId: string }> {
    const academicClass = await this.prisma.academicClass.findFirst({
      where: { id: academicClassId, schoolId },
      select: { id: true, academicLevelId: true },
    });

    if (!academicClass) {
      throw new NotFoundException('Academic class not found.');
    }

    return academicClass;
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
