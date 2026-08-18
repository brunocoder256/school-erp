import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateResponsibilityDto } from '../dto/create-responsibility.dto';
import type { ResponsibilityResponse } from '../dto/responsibility-response.dto';
import { UpdateResponsibilityDto } from '../dto/update-responsibility.dto';

const RESPONSIBILITY_SELECT = {
  id: true,
  staffId: true,
  type: true,
  isActive: true,
  academicYearId: true,
  classId: true,
  streamId: true,
  departmentId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Staff responsibility administration nested under a staff member of the
 * active school. Responsibilities cover leadership/class roles (class teacher,
 * head of department, ...) via a configurable type label. All targets are
 * optional and every referenced entity must belong to the active school.
 */
@Injectable()
export class ResponsibilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    staffId: string,
    dto: CreateResponsibilityDto,
  ): Promise<ResponsibilityResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStaffInSchool(schoolId, staffId);
    await this.requireAcademicYearInSchool(schoolId, dto.academicYearId);

    if (dto.classId) {
      await this.requireClassInSchool(schoolId, dto.classId);
    }

    if (dto.streamId) {
      if (!dto.classId) {
        throw new BadRequestException(
          'A stream cannot be assigned without a class.',
        );
      }

      await this.requireStreamInClass(dto.classId, dto.streamId);
    }

    if (dto.departmentId) {
      await this.requireDepartmentInSchool(schoolId, dto.departmentId);
    }

    try {
      return await this.prisma.staffResponsibility.create({
        data: {
          staffId,
          type: dto.type.trim(),
          academicYearId: dto.academicYearId,
          classId: dto.classId ?? null,
          streamId: dto.streamId ?? null,
          departmentId: dto.departmentId ?? null,
          isActive: dto.isActive ?? true,
        },
        select: RESPONSIBILITY_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Referenced academic year, class, stream or department not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    staffId: string,
  ): Promise<ResponsibilityResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStaffInSchool(schoolId, staffId);

    return this.prisma.staffResponsibility.findMany({
      where: { staffId },
      select: RESPONSIBILITY_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(
    activeSchoolId: string | null,
    staffId: string,
    responsibilityId: string,
    dto: UpdateResponsibilityDto,
  ): Promise<ResponsibilityResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStaffInSchool(schoolId, staffId);

    const existing = await this.prisma.staffResponsibility.findFirst({
      where: { id: responsibilityId, staffId },
      select: { id: true, classId: true, streamId: true },
    });

    if (!existing) {
      throw new NotFoundException('Responsibility not found.');
    }

    if (dto.classId === null && existing.streamId && dto.streamId !== null) {
      throw new BadRequestException(
        'Cannot clear the class of a responsibility that still has a stream.',
      );
    }

    if (dto.classId !== undefined && dto.classId !== null) {
      await this.requireClassInSchool(schoolId, dto.classId);
    }

    if (dto.streamId !== undefined && dto.streamId !== null) {
      const classId = dto.classId !== undefined ? dto.classId : existing.classId;

      if (!classId) {
        throw new BadRequestException(
          'A stream cannot be assigned without a class.',
        );
      }

      await this.requireStreamInClass(classId, dto.streamId);
    }

    if (dto.departmentId !== undefined && dto.departmentId !== null) {
      await this.requireDepartmentInSchool(schoolId, dto.departmentId);
    }

    const data: {
      type?: string;
      isActive?: boolean;
      classId?: string | null;
      streamId?: string | null;
      departmentId?: string | null;
    } = {};

    if (dto.type !== undefined) {
      data.type = dto.type.trim();
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (dto.classId !== undefined) {
      data.classId = dto.classId;
    }

    if (dto.streamId !== undefined) {
      data.streamId = dto.streamId;
    }

    if (dto.departmentId !== undefined) {
      data.departmentId = dto.departmentId;
    }

    try {
      return await this.prisma.staffResponsibility.update({
        where: { id: responsibilityId },
        data,
        select: RESPONSIBILITY_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Responsibility not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Referenced academic year, class, stream or department not found or no longer available.',
        );
      }

      throw error;
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

  private async requireDepartmentInSchool(
    schoolId: string,
    departmentId: string,
  ): Promise<void> {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, schoolId },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException('Department not found.');
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

  /**
   * Verifies the parent staff member belongs to the active school (safe 404).
   */
  private async requireStaffInSchool(
    schoolId: string,
    staffId: string,
  ): Promise<void> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, schoolId },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found.');
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