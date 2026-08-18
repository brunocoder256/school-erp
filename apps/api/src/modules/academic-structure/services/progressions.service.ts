import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateProgressionDto } from '../dto/create-progression.dto';
import type { ProgressionResponse } from '../dto/progression-response.dto';
import { UpdateProgressionDto } from '../dto/update-progression.dto';

const PROGRESSION_SELECT = {
  id: true,
  fromLevelId: true,
  toLevelId: true,
  displayOrder: true,
  isActive: true,
  schoolId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Academic level progression administration within the active school.
 *
 * Progression is configurable relationship data (P7 -> S1, S1 -> S2, ...).
 * There is no hard-coded national progression path.
 */
@Injectable()
export class ProgressionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateProgressionDto,
  ): Promise<ProgressionResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    if (dto.fromLevelId === dto.toLevelId) {
      throw new BadRequestException(
        'A level cannot progress to itself.',
      );
    }

    await this.requireLevelInSchool(schoolId, dto.fromLevelId);
    await this.requireLevelInSchool(schoolId, dto.toLevelId);

    const existing = await this.prisma.academicLevelProgression.findFirst({
      where: {
        schoolId,
        fromLevelId: dto.fromLevelId,
        toLevelId: dto.toLevelId,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'This progression rule already exists for the school.',
      );
    }

    try {
      return await this.prisma.academicLevelProgression.create({
        data: {
          schoolId,
          fromLevelId: dto.fromLevelId,
          toLevelId: dto.toLevelId,
          displayOrder: dto.displayOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
        select: PROGRESSION_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This progression rule already exists for the school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Progression levels not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
  ): Promise<ProgressionResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    return this.prisma.academicLevelProgression.findMany({
      where: { schoolId },
      select: PROGRESSION_SELECT,
      orderBy: { displayOrder: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<ProgressionResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const progression = await this.prisma.academicLevelProgression.findFirst({
      where: { id, schoolId },
      select: PROGRESSION_SELECT,
    });

    if (!progression) {
      throw new NotFoundException('Progression not found.');
    }

    return progression;
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateProgressionDto,
  ): Promise<ProgressionResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.academicLevelProgression.findFirst({
      where: { id, schoolId },
      select: { id: true, fromLevelId: true, toLevelId: true },
    });

    if (!existing) {
      throw new NotFoundException('Progression not found.');
    }

    const fromLevelId = dto.fromLevelId ?? existing.fromLevelId;
    const toLevelId = dto.toLevelId ?? existing.toLevelId;

    if (fromLevelId === toLevelId) {
      throw new BadRequestException('A level cannot progress to itself.');
    }

    if (dto.fromLevelId !== undefined) {
      await this.requireLevelInSchool(schoolId, dto.fromLevelId);
    }

    if (dto.toLevelId !== undefined) {
      await this.requireLevelInSchool(schoolId, dto.toLevelId);
    }

    const data: {
      fromLevelId?: string;
      toLevelId?: string;
      displayOrder?: number;
      isActive?: boolean;
    } = {};

    if (dto.fromLevelId !== undefined) {
      data.fromLevelId = dto.fromLevelId;
    }

    if (dto.toLevelId !== undefined) {
      data.toLevelId = dto.toLevelId;
    }

    if (dto.displayOrder !== undefined) {
      data.displayOrder = dto.displayOrder;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.academicLevelProgression.update({
        where: { id },
        data,
        select: PROGRESSION_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This progression rule already exists for the school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Progression not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Progression levels not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async delete(activeSchoolId: string | null, id: string): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.academicLevelProgression.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Progression not found.');
    }

    try {
      await this.prisma.academicLevelProgression.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Progression not found.');
      }

      throw error;
    }
  }

  /**
   * Verifies the referenced level belongs to the active school (safe 404).
   */
  private async requireLevelInSchool(
    schoolId: string,
    levelId: string,
  ): Promise<void> {
    const level = await this.prisma.academicLevel.findFirst({
      where: { id: levelId, schoolId },
      select: { id: true },
    });

    if (!level) {
      throw new NotFoundException('Academic level not found.');
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
