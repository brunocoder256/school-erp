import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSchoolDto } from '../dto/create-school.dto';
import { SchoolResponse } from '../dto/school-response.dto';
import { UpdateSchoolDto } from '../dto/update-school.dto';

/**
 * School administration — first tenant-scoped business module.
 *
 * Convention for future modules:
 * - Every tenant-scoped service method must receive an explicit
 *   `activeSchoolId` from authenticated context (never from body/query/params).
 * - Every tenant-scoped Prisma query must constrain records to that school
 *   context directly or through a verified parent relationship.
 */
@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the authenticated user's active school.
   * Tenant scope comes exclusively from `activeSchoolId`.
   */
  async getCurrentSchool(
    userId: string,
    activeSchoolId: string | null,
  ): Promise<SchoolResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireActiveMembership(userId, schoolId);

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!school) {
      throw new NotFoundException('School not found.');
    }

    return school;
  }

  /**
   * Updates the authenticated user's active school profile fields only.
   */
  async updateCurrentSchool(
    userId: string,
    activeSchoolId: string | null,
    dto: UpdateSchoolDto,
  ): Promise<SchoolResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireActiveMembership(userId, schoolId);

    const existing = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('School not found.');
    }

    const data: { name?: string; description?: string | null } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data,
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return school;
  }

  /**
   * System-level school creation (permission-gated; not tenant-scoped).
   * Does not invent memberships or role assignments.
   */
  async createSchool(dto: CreateSchoolDto): Promise<SchoolResponse> {
    const code = dto.code.trim().toUpperCase();

    const existing = await this.prisma.school.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A school with this code already exists.');
    }

    const school = await this.prisma.school.create({
      data: {
        name: dto.name.trim(),
        code,
        description: dto.description?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return school;
  }

  private requireActiveSchoolId(activeSchoolId: string | null): string {
    if (!activeSchoolId) {
      throw new ForbiddenException(
        'Active school context is required for this operation.',
      );
    }

    return activeSchoolId;
  }

  private async requireActiveMembership(
    userId: string,
    schoolId: string,
  ): Promise<void> {
    const membership = await this.prisma.schoolMembership.findUnique({
      where: {
        userId_schoolId: {
          userId,
          schoolId,
        },
      },
      select: { status: true },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new ForbiddenException(
        'You do not have an active membership for this school.',
      );
    }
  }
}
