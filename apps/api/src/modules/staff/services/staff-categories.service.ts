import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateStaffCategoryDto } from '../dto/create-staff-category.dto';
import type { StaffCategoryResponse } from '../dto/staff-category-response.dto';
import { UpdateStaffCategoryDto } from '../dto/update-staff-category.dto';

const STAFF_CATEGORY_SELECT = {
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
 * Staff category administration within the active school context.
 *
 * Categories are configurable staff classifications. A school defines its own
 * categories (or none). Deletion is only allowed while no staff reference the
 * category.
 */
@Injectable()
export class StaffCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateStaffCategoryDto,
  ): Promise<StaffCategoryResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.staffCategory.findFirst({
      where: { schoolId, code: dto.code.trim() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A staff category with this code already exists in this school.',
      );
    }

    try {
      return await this.prisma.staffCategory.create({
        data: {
          schoolId,
          name: dto.name.trim(),
          code: dto.code.trim(),
          description: dto.description?.trim() || null,
          displayOrder: dto.displayOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
        select: STAFF_CATEGORY_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A staff category with this code already exists in this school.',
        );
      }

      throw error;
    }
  }

  async list(activeSchoolId: string | null): Promise<StaffCategoryResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    return this.prisma.staffCategory.findMany({
      where: { schoolId },
      select: STAFF_CATEGORY_SELECT,
      orderBy: { displayOrder: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    staffCategoryId: string,
  ): Promise<StaffCategoryResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const category = await this.prisma.staffCategory.findFirst({
      where: { id: staffCategoryId, schoolId },
      select: STAFF_CATEGORY_SELECT,
    });

    if (!category) {
      throw new NotFoundException('Staff category not found.');
    }

    return category;
  }

  async update(
    activeSchoolId: string | null,
    staffCategoryId: string,
    dto: UpdateStaffCategoryDto,
  ): Promise<StaffCategoryResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.staffCategory.findFirst({
      where: { id: staffCategoryId, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Staff category not found.');
    }

    if (dto.code !== undefined) {
      const duplicate = await this.prisma.staffCategory.findFirst({
        where: { schoolId, code: dto.code.trim() },
        select: { id: true },
      });

      if (duplicate && duplicate.id !== staffCategoryId) {
        throw new ConflictException(
          'A staff category with this code already exists in this school.',
        );
      }
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
      return await this.prisma.staffCategory.update({
        where: { id: staffCategoryId },
        data,
        select: STAFF_CATEGORY_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A staff category with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Staff category not found.');
      }

      throw error;
    }
  }

  async delete(
    activeSchoolId: string | null,
    staffCategoryId: string,
  ): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const category = await this.prisma.staffCategory.findFirst({
      where: { id: staffCategoryId, schoolId },
      select: {
        id: true,
        _count: { select: { staffMembers: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Staff category not found.');
    }

    if (category._count.staffMembers > 0) {
      throw new ConflictException(
        'Cannot delete a staff category that still has staff members.',
      );
    }

    try {
      await this.prisma.staffCategory.delete({ where: { id: staffCategoryId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Staff category not found.');
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