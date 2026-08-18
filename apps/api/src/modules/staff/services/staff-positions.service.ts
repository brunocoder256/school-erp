import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateStaffPositionDto } from '../dto/create-staff-position.dto';
import type { StaffPositionResponse } from '../dto/staff-position-response.dto';
import { UpdateStaffPositionDto } from '../dto/update-staff-position.dto';

const STAFF_POSITION_SELECT = {
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
 * Staff position/designation administration within the active school context.
 *
 * Positions are configurable (never a hard-coded enum). A school defines its
 * own designations. Deletion is only allowed while no staff hold the position.
 */
@Injectable()
export class StaffPositionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateStaffPositionDto,
  ): Promise<StaffPositionResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.staffPosition.findFirst({
      where: { schoolId, code: dto.code.trim() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A staff position with this code already exists in this school.',
      );
    }

    try {
      return await this.prisma.staffPosition.create({
        data: {
          schoolId,
          name: dto.name.trim(),
          code: dto.code.trim(),
          description: dto.description?.trim() || null,
          isActive: dto.isActive ?? true,
        },
        select: STAFF_POSITION_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A staff position with this code already exists in this school.',
        );
      }

      throw error;
    }
  }

  async list(activeSchoolId: string | null): Promise<StaffPositionResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    return this.prisma.staffPosition.findMany({
      where: { schoolId },
      select: STAFF_POSITION_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    positionId: string,
  ): Promise<StaffPositionResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const position = await this.prisma.staffPosition.findFirst({
      where: { id: positionId, schoolId },
      select: STAFF_POSITION_SELECT,
    });

    if (!position) {
      throw new NotFoundException('Staff position not found.');
    }

    return position;
  }

  async update(
    activeSchoolId: string | null,
    positionId: string,
    dto: UpdateStaffPositionDto,
  ): Promise<StaffPositionResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.staffPosition.findFirst({
      where: { id: positionId, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Staff position not found.');
    }

    if (dto.code !== undefined) {
      const duplicate = await this.prisma.staffPosition.findFirst({
        where: { schoolId, code: dto.code.trim() },
        select: { id: true },
      });

      if (duplicate && duplicate.id !== positionId) {
        throw new ConflictException(
          'A staff position with this code already exists in this school.',
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
      return await this.prisma.staffPosition.update({
        where: { id: positionId },
        data,
        select: STAFF_POSITION_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A staff position with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Staff position not found.');
      }

      throw error;
    }
  }

  async delete(
    activeSchoolId: string | null,
    positionId: string,
  ): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const position = await this.prisma.staffPosition.findFirst({
      where: { id: positionId, schoolId },
      select: {
        id: true,
        _count: { select: { staffMembers: true } },
      },
    });

    if (!position) {
      throw new NotFoundException('Staff position not found.');
    }

    if (position._count.staffMembers > 0) {
      throw new ConflictException(
        'Cannot delete a staff position that is still held by staff members.',
      );
    }

    try {
      await this.prisma.staffPosition.delete({ where: { id: positionId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Staff position not found.');
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