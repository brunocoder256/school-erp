import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSectionDto } from '../dto/create-section.dto';
import type { SectionResponse } from '../dto/section-response.dto';
import { UpdateSectionDto } from '../dto/update-section.dto';

const SECTION_SELECT = {
  id: true,
  name: true,
  code: true,
  description: true,
  displayOrder: true,
  isActive: true,
  schoolId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Education section administration within the active school context.
 *
 * Sections are configurable data (Nursery, Primary, Lower Secondary, ...).
 * The tenant context is the authenticated activeSchoolId; every query is
 * scoped through schoolId, so a section of another school is
 * indistinguishable from a nonexistent one (safe 404).
 */
@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateSectionDto,
  ): Promise<SectionResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    const name = dto.name.trim();
    const code = dto.code.trim();

    const existing = await this.prisma.educationSection.findFirst({
      where: { schoolId, code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A section with this code already exists in this school.',
      );
    }

    try {
      return await this.prisma.educationSection.create({
        data: {
          schoolId,
          name,
          code,
          description: dto.description?.trim() || null,
          displayOrder: dto.displayOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
        select: SECTION_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A section with this code already exists in this school.',
        );
      }

      throw error;
    }
  }

  async list(activeSchoolId: string | null): Promise<SectionResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    return this.prisma.educationSection.findMany({
      where: { schoolId },
      select: SECTION_SELECT,
      orderBy: { displayOrder: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<SectionResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const section = await this.prisma.educationSection.findFirst({
      where: { id, schoolId },
      select: SECTION_SELECT,
    });

    if (!section) {
      throw new NotFoundException('Section not found.');
    }

    return section;
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateSectionDto,
  ): Promise<SectionResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.educationSection.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Section not found.');
    }

    const data: {
      name?: string;
      code?: string;
      description?: string | null;
      displayOrder?: number;
      isActive?: boolean;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.code !== undefined) {
      data.code = dto.code.trim();
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    if (dto.displayOrder !== undefined) {
      data.displayOrder = dto.displayOrder;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.educationSection.update({
        where: { id },
        data,
        select: SECTION_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A section with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Section not found.');
      }

      throw error;
    }
  }

  async delete(activeSchoolId: string | null, id: string): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const section = await this.prisma.educationSection.findFirst({
      where: { id, schoolId },
      select: { id: true, _count: { select: { levels: true } } },
    });

    if (!section) {
      throw new NotFoundException('Section not found.');
    }

    if (section._count.levels > 0) {
      throw new ConflictException(
        'Cannot delete a section that still has academic levels.',
      );
    }

    try {
      await this.prisma.educationSection.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Section not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete a section that still has academic levels.',
        );
      }

      throw error;
    }
  }

  protected requireActiveSchoolId(activeSchoolId: string | null): string {
    if (!activeSchoolId) {
      throw new ForbiddenException(
        'Active school context is required for this operation.',
      );
    }

    return activeSchoolId;
  }
}
