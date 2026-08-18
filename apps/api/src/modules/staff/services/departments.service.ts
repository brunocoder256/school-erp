import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import type { DepartmentResponse } from '../dto/department-response.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';

const DEPARTMENT_SELECT = {
  id: true,
  name: true,
  code: true,
  description: true,
  isActive: true,
  schoolId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Department administration within the active school context.
 *
 * Departments are optional configurable structure. Staff may optionally belong
 * to a department, but department assignment is never required. Deletion is
 * only allowed while nothing references the department (safe referential
 * behavior — history is preserved by refusing to destroy referenced records).
 */
@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateDepartmentDto,
  ): Promise<DepartmentResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.department.findFirst({
      where: { schoolId, code: dto.code.trim() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A department with this code already exists in this school.',
      );
    }

    try {
      return await this.prisma.department.create({
        data: {
          schoolId,
          name: dto.name.trim(),
          code: dto.code.trim(),
          description: dto.description?.trim() || null,
          isActive: dto.isActive ?? true,
        },
        select: DEPARTMENT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A department with this code already exists in this school.',
        );
      }

      throw error;
    }
  }

  async list(activeSchoolId: string | null): Promise<DepartmentResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    return this.prisma.department.findMany({
      where: { schoolId },
      select: DEPARTMENT_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    departmentId: string,
  ): Promise<DepartmentResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, schoolId },
      select: DEPARTMENT_SELECT,
    });

    if (!department) {
      throw new NotFoundException('Department not found.');
    }

    return department;
  }

  async update(
    activeSchoolId: string | null,
    departmentId: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.department.findFirst({
      where: { id: departmentId, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Department not found.');
    }

    if (dto.code !== undefined) {
      const duplicate = await this.prisma.department.findFirst({
        where: { schoolId, code: dto.code.trim() },
        select: { id: true },
      });

      if (duplicate && duplicate.id !== departmentId) {
        throw new ConflictException(
          'A department with this code already exists in this school.',
        );
      }
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
      return await this.prisma.department.update({
        where: { id: departmentId },
        data,
        select: DEPARTMENT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A department with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Department not found.');
      }

      throw error;
    }
  }

  async delete(
    activeSchoolId: string | null,
    departmentId: string,
  ): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, schoolId },
      select: {
        id: true,
        _count: { select: { staffMembers: true, responsibilities: true } },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found.');
    }

    if (department._count.staffMembers > 0) {
      throw new ConflictException(
        'Cannot delete a department that still has staff members.',
      );
    }

    if (department._count.responsibilities > 0) {
      throw new ConflictException(
        'Cannot delete a department that still has responsibilities.',
      );
    }

    try {
      await this.prisma.department.delete({ where: { id: departmentId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Department not found.');
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