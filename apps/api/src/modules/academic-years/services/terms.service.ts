import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTermDto } from '../dto/create-term.dto';
import type { TermResponse } from '../dto/term-response.dto';
import { UpdateTermDto } from '../dto/update-term.dto';

const TERM_SELECT = {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  isActive: true,
  academicYearId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Term administration within the active school context.
 *
 * Terms have no school column — the tenant relationship is
 * term → academic year → activeSchoolId. Every operation first verifies the
 * parent academic year belongs to the authenticated active school, then scopes
 * the term query to that academic year. A term under an academic year of
 * another school is reported as not found (safe 404).
 */
@Injectable()
export class TermsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    academicYearId: string,
    dto: CreateTermDto,
  ): Promise<TermResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireAcademicYearInSchool(schoolId, academicYearId);

    this.validateDateRange(dto.startDate, dto.endDate);

    const name = dto.name.trim();

    const existing = await this.prisma.term.findFirst({
      where: { academicYearId, name },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A term with this name already exists in this academic year.',
      );
    }

    try {
      return await this.prisma.term.create({
        data: {
          academicYearId,
          name,
          startDate: dto.startDate,
          endDate: dto.endDate,
          isActive: dto.isActive ?? false,
        },
        select: TERM_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A term with this name already exists in this academic year.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    academicYearId: string,
  ): Promise<TermResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireAcademicYearInSchool(schoolId, academicYearId);

    return this.prisma.term.findMany({
      where: { academicYearId },
      select: TERM_SELECT,
      orderBy: { startDate: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    academicYearId: string,
    termId: string,
  ): Promise<TermResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireAcademicYearInSchool(schoolId, academicYearId);

    const term = await this.prisma.term.findFirst({
      where: { id: termId, academicYearId },
      select: TERM_SELECT,
    });

    if (!term) {
      throw new NotFoundException('Term not found.');
    }

    return term;
  }

  async update(
    activeSchoolId: string | null,
    academicYearId: string,
    termId: string,
    dto: UpdateTermDto,
  ): Promise<TermResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireAcademicYearInSchool(schoolId, academicYearId);

    const existing = await this.prisma.term.findFirst({
      where: { id: termId, academicYearId },
      select: { id: true, startDate: true, endDate: true },
    });

    if (!existing) {
      throw new NotFoundException('Term not found.');
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
      return await this.prisma.term.update({
        where: { id: termId },
        data,
        select: TERM_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A term with this name already exists in this academic year.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Term not found.');
      }

      throw error;
    }
  }

  async delete(
    activeSchoolId: string | null,
    academicYearId: string,
    termId: string,
  ): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireAcademicYearInSchool(schoolId, academicYearId);

    const existing = await this.prisma.term.findFirst({
      where: { id: termId, academicYearId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Term not found.');
    }

    try {
      await this.prisma.term.delete({
        where: { id: termId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Term not found.');
      }

      throw error;
    }
  }

  /**
   * Verifies the parent academic year belongs to the active school before any
   * term-level query runs. Cross-school academic years are indistinguishable
   * from nonexistent ones (safe 404).
   */
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
