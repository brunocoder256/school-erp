import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import type { SubjectResponse } from '../dto/subject-response.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';

const SUBJECT_SELECT = {
  id: true,
  name: true,
  code: true,
  shortName: true,
  description: true,
  displayOrder: true,
  isActive: true,
  schoolId: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Subject / learning-area administration within the active school context.
 * The subject catalog is configurable data — never hard-coded subjects.
 */
@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateSubjectDto,
  ): Promise<SubjectResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireCategoryInSchool(schoolId, dto.categoryId);

    const name = dto.name.trim();
    const code = dto.code.trim();

    const existing = await this.prisma.subject.findFirst({
      where: { schoolId, code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A subject with this code already exists in this school.',
      );
    }

    try {
      return await this.prisma.subject.create({
        data: {
          schoolId,
          categoryId: dto.categoryId,
          name,
          code,
          shortName: dto.shortName?.trim() || null,
          description: dto.description?.trim() || null,
          displayOrder: dto.displayOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
        select: SUBJECT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A subject with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Subject category not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async list(activeSchoolId: string | null): Promise<SubjectResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    return this.prisma.subject.findMany({
      where: { schoolId },
      select: SUBJECT_SELECT,
      orderBy: { displayOrder: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<SubjectResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const subject = await this.prisma.subject.findFirst({
      where: { id, schoolId },
      select: SUBJECT_SELECT,
    });

    if (!subject) {
      throw new NotFoundException('Subject not found.');
    }

    return subject;
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateSubjectDto,
  ): Promise<SubjectResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    if (dto.categoryId !== undefined) {
      await this.requireCategoryInSchool(schoolId, dto.categoryId);
    }

    const existing = await this.prisma.subject.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Subject not found.');
    }

    const data: {
      name?: string;
      code?: string;
      shortName?: string | null;
      description?: string | null;
      displayOrder?: number;
      isActive?: boolean;
      categoryId?: string;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.code !== undefined) {
      data.code = dto.code.trim();
    }

    if (dto.shortName !== undefined) {
      data.shortName = dto.shortName?.trim() || null;
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

    if (dto.categoryId !== undefined) {
      data.categoryId = dto.categoryId;
    }

    try {
      return await this.prisma.subject.update({
        where: { id },
        data,
        select: SUBJECT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A subject with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Subject not found.');
      }

      throw error;
    }
  }

  async delete(activeSchoolId: string | null, id: string): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const subject = await this.prisma.subject.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        _count: { select: { offerings: true, combinations: true } },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found.');
    }

    if (subject._count.offerings > 0) {
      throw new ConflictException(
        'Cannot delete a subject that is still offered.',
      );
    }

    if (subject._count.combinations > 0) {
      throw new ConflictException(
        'Cannot delete a subject that is still used by a combination.',
      );
    }

    try {
      await this.prisma.subject.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Subject not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete a subject that is still referenced.',
        );
      }

      throw error;
    }
  }

  /**
   * Verifies the referenced category belongs to the active school (safe 404).
   */
  private async requireCategoryInSchool(
    schoolId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.prisma.subjectCategory.findFirst({
      where: { id: categoryId, schoolId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Subject category not found.');
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