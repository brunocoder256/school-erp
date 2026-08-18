import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { AcademicYearResponse } from '../dto/academic-year-response.dto';
import { CreateAcademicYearDto } from '../dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from '../dto/update-academic-year.dto';

const ACADEMIC_YEAR_SELECT = {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  isActive: true,
  schoolId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Academic year administration within the active school context.
 *
 * The school is never supplied by the client — every method receives the
 * authenticated user's activeSchoolId. Every query is scoped through
 * schoolId = activeSchoolId, so a record belonging to another school is
 * indistinguishable from a nonexistent one (safe 404).
 */
@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateAcademicYearDto,
  ): Promise<AcademicYearResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    this.validateDateRange(dto.startDate, dto.endDate);

    const name = dto.name.trim();

    const existing = await this.prisma.academicYear.findFirst({
      where: { schoolId, name },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'An academic year with this name already exists in this school.',
      );
    }

    try {
      return await this.prisma.academicYear.create({
        data: {
          schoolId,
          name,
          startDate: dto.startDate,
          endDate: dto.endDate,
          isActive: dto.isActive ?? false,
        },
        select: ACADEMIC_YEAR_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An academic year with this name already exists in this school.',
        );
      }

      throw error;
    }
  }

  async list(activeSchoolId: string | null): Promise<AcademicYearResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    return this.prisma.academicYear.findMany({
      where: { schoolId },
      select: ACADEMIC_YEAR_SELECT,
      orderBy: { startDate: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<AcademicYearResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id, schoolId },
      select: ACADEMIC_YEAR_SELECT,
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found.');
    }

    return academicYear;
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateAcademicYearDto,
  ): Promise<AcademicYearResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.academicYear.findFirst({
      where: { id, schoolId },
      select: { id: true, startDate: true, endDate: true },
    });

    if (!existing) {
      throw new NotFoundException('Academic year not found.');
    }

    const data: {
      name?: string;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate;
    }

    if (dto.endDate !== undefined) {
      data.endDate = dto.endDate;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    this.validateDateRange(
      data.startDate ?? existing.startDate,
      data.endDate ?? existing.endDate,
    );

    try {
      return await this.prisma.academicYear.update({
        where: { id },
        data,
        select: ACADEMIC_YEAR_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An academic year with this name already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Academic year not found.');
      }

      throw error;
    }
  }

  async delete(activeSchoolId: string | null, id: string): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        _count: { select: { terms: true, enrollments: true } },
      },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found.');
    }

    if (academicYear._count.terms > 0) {
      throw new ConflictException(
        'Cannot delete an academic year that still has terms. Delete or move its terms first.',
      );
    }

    if (academicYear._count.enrollments > 0) {
      throw new ConflictException(
        'Cannot delete an academic year that still has enrollments.',
      );
    }

    try {
      await this.prisma.academicYear.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Academic year not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete an academic year that still has enrollments.',
        );
      }

      throw error;
    }
  }

  private validateDateRange(
    startDate: string | Date,
    endDate: string | Date,
  ): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('startDate must be a valid date.');
    }

    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException('endDate must be a valid date.');
    }

    if (end < start) {
      throw new BadRequestException('endDate must not be before startDate.');
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
