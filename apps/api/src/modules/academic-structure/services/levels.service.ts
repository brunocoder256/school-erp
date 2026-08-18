import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateLevelDto } from '../dto/create-level.dto';
import type { LevelResponse } from '../dto/level-response.dto';
import { UpdateLevelDto } from '../dto/update-level.dto';

const LEVEL_SELECT = {
  id: true,
  name: true,
  code: true,
  levelNumber: true,
  description: true,
  displayOrder: true,
  canEnroll: true,
  isTerminal: true,
  isActive: true,
  schoolId: true,
  sectionId: true,
  academicOrganizationId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Academic level administration nested under a section of the active school.
 *
 * Levels such as N1-N3, P1-P7 and S1-S6 are configurable data. Every
 * operation verifies the parent section belongs to the authenticated active
 * school; a level under a section of another school is indistinguishable from
 * a nonexistent one (safe 404).
 */
@Injectable()
export class LevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    sectionId: string,
    dto: CreateLevelDto,
  ): Promise<LevelResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireSectionInSchool(schoolId, sectionId);
    await this.requireOrganizationInSchool(schoolId, dto.academicOrganizationId);

    const name = dto.name.trim();
    const code = dto.code.trim();

    const existing = await this.prisma.academicLevel.findFirst({
      where: { schoolId, code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'An academic level with this code already exists in this school.',
      );
    }

    try {
      return await this.prisma.academicLevel.create({
        data: {
          schoolId,
          sectionId,
          academicOrganizationId: dto.academicOrganizationId,
          name,
          code,
          levelNumber: dto.levelNumber,
          description: dto.description?.trim() || null,
          displayOrder: dto.displayOrder ?? 0,
          canEnroll: dto.canEnroll ?? true,
          isTerminal: dto.isTerminal ?? false,
          isActive: dto.isActive ?? true,
        },
        select: LEVEL_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An academic level with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Section or academic organization not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    sectionId: string,
  ): Promise<LevelResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireSectionInSchool(schoolId, sectionId);

    return this.prisma.academicLevel.findMany({
      where: { sectionId },
      select: LEVEL_SELECT,
      orderBy: { displayOrder: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    sectionId: string,
    levelId: string,
  ): Promise<LevelResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireSectionInSchool(schoolId, sectionId);

    const level = await this.prisma.academicLevel.findFirst({
      where: { id: levelId, sectionId },
      select: LEVEL_SELECT,
    });

    if (!level) {
      throw new NotFoundException('Academic level not found.');
    }

    return level;
  }

  async update(
    activeSchoolId: string | null,
    sectionId: string,
    levelId: string,
    dto: UpdateLevelDto,
  ): Promise<LevelResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireSectionInSchool(schoolId, sectionId);

    if (dto.academicOrganizationId !== undefined) {
      await this.requireOrganizationInSchool(schoolId, dto.academicOrganizationId);
    }

    const existing = await this.prisma.academicLevel.findFirst({
      where: { id: levelId, sectionId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Academic level not found.');
    }

    const data: {
      name?: string;
      code?: string;
      levelNumber?: number;
      description?: string | null;
      displayOrder?: number;
      canEnroll?: boolean;
      isTerminal?: boolean;
      isActive?: boolean;
      academicOrganizationId?: string;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.code !== undefined) {
      data.code = dto.code.trim();
    }

    if (dto.levelNumber !== undefined) {
      data.levelNumber = dto.levelNumber;
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    if (dto.displayOrder !== undefined) {
      data.displayOrder = dto.displayOrder;
    }

    if (dto.canEnroll !== undefined) {
      data.canEnroll = dto.canEnroll;
    }

    if (dto.isTerminal !== undefined) {
      data.isTerminal = dto.isTerminal;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (dto.academicOrganizationId !== undefined) {
      data.academicOrganizationId = dto.academicOrganizationId;
    }

    try {
      return await this.prisma.academicLevel.update({
        where: { id: levelId },
        data,
        select: LEVEL_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An academic level with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Academic level not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Academic organization not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async delete(
    activeSchoolId: string | null,
    sectionId: string,
    levelId: string,
  ): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireSectionInSchool(schoolId, sectionId);

    const level = await this.prisma.academicLevel.findFirst({
      where: { id: levelId, sectionId },
      select: {
        id: true,
        _count: {
          select: { classes: true, fromProgressions: true, toProgressions: true },
        },
      },
    });

    if (!level) {
      throw new NotFoundException('Academic level not found.');
    }

    if (level._count.classes > 0) {
      throw new ConflictException(
        'Cannot delete an academic level that still has classes.',
      );
    }

    if (level._count.fromProgressions > 0 || level._count.toProgressions > 0) {
      throw new ConflictException(
        'Cannot delete an academic level that is used by progression rules.',
      );
    }

    try {
      await this.prisma.academicLevel.delete({ where: { id: levelId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Academic level not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete an academic level that is still referenced.',
        );
      }

      throw error;
    }
  }

  /**
   * Verifies the parent section belongs to the active school before any
   * level-level query runs (safe 404 for cross-school sections).
   */
  private async requireSectionInSchool(
    schoolId: string,
    sectionId: string,
  ): Promise<void> {
    const section = await this.prisma.educationSection.findFirst({
      where: { id: sectionId, schoolId },
      select: { id: true },
    });

    if (!section) {
      throw new NotFoundException('Section not found.');
    }
  }

  private async requireOrganizationInSchool(
    schoolId: string,
    academicOrganizationId: string,
  ): Promise<void> {
    const organization = await this.prisma.academicOrganization.findFirst({
      where: { id: academicOrganizationId, schoolId },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException('Academic organization not found.');
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
