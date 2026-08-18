import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSubjectCategoryDto } from '../dto/create-subject-category.dto';
import type { SubjectCategoryResponse } from '../dto/subject-category-response.dto';
import { UpdateSubjectCategoryDto } from '../dto/update-subject-category.dto';

const SUBJECT_CATEGORY_SELECT = {
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
 * Subject category administration within the active school context.
 * Categories (Core, Elective, Science, ...) are configurable data, never
 * hard-coded subject clusters.
 */
@Injectable()
export class SubjectCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateSubjectCategoryDto,
  ): Promise<SubjectCategoryResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    const name = dto.name.trim();
    const code = dto.code.trim();

    const existing = await this.prisma.subjectCategory.findFirst({
      where: { schoolId, code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A subject category with this code already exists in this school.',
      );
    }

    try {
      return await this.prisma.subjectCategory.create({
        data: {
          schoolId,
          name,
          code,
          description: dto.description?.trim() || null,
          displayOrder: dto.displayOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
        select: SUBJECT_CATEGORY_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A subject category with this code already exists in this school.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
  ): Promise<SubjectCategoryResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    return this.prisma.subjectCategory.findMany({
      where: { schoolId },
      select: SUBJECT_CATEGORY_SELECT,
      orderBy: { displayOrder: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<SubjectCategoryResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const category = await this.prisma.subjectCategory.findFirst({
      where: { id, schoolId },
      select: SUBJECT_CATEGORY_SELECT,
    });

    if (!category) {
      throw new NotFoundException('Subject category not found.');
    }

    return category;
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateSubjectCategoryDto,
  ): Promise<SubjectCategoryResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.subjectCategory.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Subject category not found.');
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
      return await this.prisma.subjectCategory.update({
        where: { id },
        data,
        select: SUBJECT_CATEGORY_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A subject category with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Subject category not found.');
      }

      throw error;
    }
  }

  async delete(activeSchoolId: string | null, id: string): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const category = await this.prisma.subjectCategory.findFirst({
      where: { id, schoolId },
      select: { id: true, _count: { select: { subjects: true } } },
    });

    if (!category) {
      throw new NotFoundException('Subject category not found.');
    }

    if (category._count.subjects > 0) {
      throw new ConflictException(
        'Cannot delete a subject category that still has subjects.',
      );
    }

    try {
      await this.prisma.subjectCategory.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Subject category not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete a subject category that still has subjects.',
        );
      }

      throw error;
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