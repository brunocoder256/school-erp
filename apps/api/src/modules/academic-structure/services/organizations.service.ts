import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import type { OrganizationResponse } from '../dto/organization-response.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

const ORGANIZATION_SELECT = {
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
 * Academic organization model administration within the active school.
 *
 * Organization models (e.g. THEMATIC, SUBJECT_BASED, COMPETENCY_BASED, MIXED,
 * CUSTOM) are configurable data that a school assigns to its academic levels.
 * They are deliberately not hard-coded enums.
 */
@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateOrganizationDto,
  ): Promise<OrganizationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    const name = dto.name.trim();
    const code = dto.code.trim();

    const existing = await this.prisma.academicOrganization.findFirst({
      where: { schoolId, code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'An academic organization with this code already exists in this school.',
      );
    }

    try {
      return await this.prisma.academicOrganization.create({
        data: {
          schoolId,
          name,
          code,
          description: dto.description?.trim() || null,
          isActive: dto.isActive ?? true,
        },
        select: ORGANIZATION_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An academic organization with this code already exists in this school.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
  ): Promise<OrganizationResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    return this.prisma.academicOrganization.findMany({
      where: { schoolId },
      select: ORGANIZATION_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<OrganizationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const organization = await this.prisma.academicOrganization.findFirst({
      where: { id, schoolId },
      select: ORGANIZATION_SELECT,
    });

    if (!organization) {
      throw new NotFoundException('Academic organization not found.');
    }

    return organization;
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.academicOrganization.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Academic organization not found.');
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
      return await this.prisma.academicOrganization.update({
        where: { id },
        data,
        select: ORGANIZATION_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An academic organization with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Academic organization not found.');
      }

      throw error;
    }
  }

  async delete(activeSchoolId: string | null, id: string): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const organization = await this.prisma.academicOrganization.findFirst({
      where: { id, schoolId },
      select: { id: true, _count: { select: { levels: true } } },
    });

    if (!organization) {
      throw new NotFoundException('Academic organization not found.');
    }

    if (organization._count.levels > 0) {
      throw new ConflictException(
        'Cannot delete an academic organization that is still used by academic levels.',
      );
    }

    try {
      await this.prisma.academicOrganization.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Academic organization not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete an academic organization that is still used by academic levels.',
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
