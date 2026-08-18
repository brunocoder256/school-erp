import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateClassDto } from '../dto/create-class.dto';
import type { ClassResponse } from '../dto/class-response.dto';
import { UpdateClassDto } from '../dto/update-class.dto';

const CLASS_SELECT = {
  id: true,
  name: true,
  code: true,
  description: true,
  isActive: true,
  schoolId: true,
  academicLevelId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Academic class administration nested under a level of the active school.
 *
 * The existing AcademicClass model is reused (no duplicate). Every operation
 * verifies the parent level belongs to the active school (safe 404).
 */
@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    academicLevelId: string,
    dto: CreateClassDto,
  ): Promise<ClassResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireLevelInSchool(schoolId, academicLevelId);

    const name = dto.name.trim();
    const code = dto.code.trim();

    const existing = await this.prisma.academicClass.findFirst({
      where: { schoolId, code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A class with this code already exists in this school.',
      );
    }

    try {
      return await this.prisma.academicClass.create({
        data: {
          schoolId,
          academicLevelId,
          name,
          code,
          description: dto.description?.trim() || null,
          isActive: dto.isActive ?? true,
        },
        select: CLASS_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A class with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Academic level not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    academicLevelId: string,
  ): Promise<ClassResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireLevelInSchool(schoolId, academicLevelId);

    return this.prisma.academicClass.findMany({
      where: { academicLevelId },
      select: CLASS_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    academicLevelId: string,
    classId: string,
  ): Promise<ClassResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireLevelInSchool(schoolId, academicLevelId);

    const academicClass = await this.prisma.academicClass.findFirst({
      where: { id: classId, academicLevelId },
      select: CLASS_SELECT,
    });

    if (!academicClass) {
      throw new NotFoundException('Academic class not found.');
    }

    return academicClass;
  }

  async update(
    activeSchoolId: string | null,
    academicLevelId: string,
    classId: string,
    dto: UpdateClassDto,
  ): Promise<ClassResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireLevelInSchool(schoolId, academicLevelId);

    const existing = await this.prisma.academicClass.findFirst({
      where: { id: classId, academicLevelId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Academic class not found.');
    }

    const data: {
      name?: string;
      code?: string;
      description?: string | null;
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

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.academicClass.update({
        where: { id: classId },
        data,
        select: CLASS_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A class with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Academic class not found.');
      }

      throw error;
    }
  }

  async delete(
    activeSchoolId: string | null,
    academicLevelId: string,
    classId: string,
  ): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireLevelInSchool(schoolId, academicLevelId);

    const academicClass = await this.prisma.academicClass.findFirst({
      where: { id: classId, academicLevelId },
      select: {
        id: true,
        _count: { select: { streams: true, enrollments: true } },
      },
    });

    if (!academicClass) {
      throw new NotFoundException('Academic class not found.');
    }

    if (academicClass._count.streams > 0) {
      throw new ConflictException(
        'Cannot delete a class that still has streams.',
      );
    }

    if (academicClass._count.enrollments > 0) {
      throw new ConflictException(
        'Cannot delete a class that still has enrollments.',
      );
    }

    try {
      await this.prisma.academicClass.delete({ where: { id: classId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Academic class not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete a class that is still referenced.',
        );
      }

      throw error;
    }
  }

  /**
   * Verifies the parent level belongs to the active school (safe 404).
   */
  private async requireLevelInSchool(
    schoolId: string,
    academicLevelId: string,
  ): Promise<void> {
    const level = await this.prisma.academicLevel.findFirst({
      where: { id: academicLevelId, schoolId },
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
