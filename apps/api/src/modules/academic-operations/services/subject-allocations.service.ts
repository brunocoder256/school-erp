import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSubjectAllocationDto } from '../dto/create-subject-allocation.dto';
import { ListSubjectAllocationsQueryDto } from '../dto/list-subject-allocations-query.dto';
import type { SubjectAllocationResponse } from '../dto/subject-allocation-response.dto';
import { UpdateSubjectAllocationDto } from '../dto/update-subject-allocation.dto';

const SUBJECT_ALLOCATION_SELECT = {
  id: true,
  isActive: true,
  schoolId: true,
  academicYearId: true,
  academicClassId: true,
  streamId: true,
  subjectOfferingId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Subject allocation administration within the active school context.
 *
 * An allocation connects a subject offering (subject + level + year) to an
 * academic class and optional stream. The offering's level must match the
 * class level and its year must match the allocation year, so a class can
 * never be allocated a subject it does not offer. Duplicates are prevented at
 * the application layer for every context (the database unique index covers
 * streamed rows; PostgreSQL treats null stream values as distinct).
 */
@Injectable()
export class SubjectAllocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateSubjectAllocationDto,
  ): Promise<SubjectAllocationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireYearInSchool(schoolId, dto.academicYearId);
    const academicClass = await this.requireClassInSchool(
      schoolId,
      dto.academicClassId,
    );

    if (dto.streamId) {
      await this.requireStreamInClass(dto.academicClassId, dto.streamId);
    }

    await this.requireOfferingCompatible(
      schoolId,
      dto.subjectOfferingId,
      dto.academicYearId,
      academicClass.academicLevelId,
    );

    await this.requireNoDuplicate(
      schoolId,
      dto.academicYearId,
      dto.academicClassId,
      dto.streamId ?? null,
      dto.subjectOfferingId,
    );

    try {
      return await this.prisma.subjectAllocation.create({
        data: {
          schoolId,
          academicYearId: dto.academicYearId,
          academicClassId: dto.academicClassId,
          streamId: dto.streamId ?? null,
          subjectOfferingId: dto.subjectOfferingId,
          isActive: dto.isActive ?? true,
        },
        select: SUBJECT_ALLOCATION_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This subject is already allocated to that class and stream for the academic year.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Academic year, class, stream or subject offering not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    query: ListSubjectAllocationsQueryDto,
  ): Promise<SubjectAllocationResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const where: Record<string, unknown> = { schoolId };

    if (query.academicYearId !== undefined) {
      await this.requireYearInSchool(schoolId, query.academicYearId);
      where.academicYearId = query.academicYearId;
    }

    if (query.academicClassId !== undefined) {
      await this.requireClassInSchool(schoolId, query.academicClassId);
      where.academicClassId = query.academicClassId;
    }

    if (query.streamId !== undefined) {
      where.streamId = query.streamId;
    }

    if (query.subjectOfferingId !== undefined) {
      await this.requireOfferingInSchool(schoolId, query.subjectOfferingId);
      where.subjectOfferingId = query.subjectOfferingId;
    }

    if (query.subjectId !== undefined) {
      const offerings = await this.prisma.subjectOffering.findMany({
        where: { schoolId, subjectId: query.subjectId },
        select: { id: true },
      });
      where.subjectOfferingId = { in: offerings.map((item) => item.id) };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return this.prisma.subjectAllocation.findMany({
      where,
      select: SUBJECT_ALLOCATION_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<SubjectAllocationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const allocation = await this.prisma.subjectAllocation.findFirst({
      where: { id, schoolId },
      select: SUBJECT_ALLOCATION_SELECT,
    });

    if (!allocation) {
      throw new NotFoundException('Subject allocation not found.');
    }

    return allocation;
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateSubjectAllocationDto,
  ): Promise<SubjectAllocationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.subjectAllocation.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        academicYearId: true,
        academicClassId: true,
        streamId: true,
        subjectOfferingId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Subject allocation not found.');
    }

    if (dto.streamId !== undefined && dto.streamId !== null) {
      await this.requireStreamInClass(existing.academicClassId, dto.streamId);
    }

    const subjectOfferingId =
      dto.subjectOfferingId ?? existing.subjectOfferingId;

    if (dto.subjectOfferingId !== undefined) {
      const academicClass = await this.requireClassInSchool(
        schoolId,
        existing.academicClassId,
      );
      await this.requireOfferingCompatible(
        schoolId,
        subjectOfferingId,
        existing.academicYearId,
        academicClass.academicLevelId,
      );
    }

    const streamId =
      dto.streamId !== undefined ? dto.streamId : existing.streamId;

    await this.requireNoDuplicate(
      schoolId,
      existing.academicYearId,
      existing.academicClassId,
      streamId,
      subjectOfferingId,
      existing.id,
    );

    const data: {
      streamId?: string | null;
      subjectOfferingId?: string;
      isActive?: boolean;
    } = {};

    if (dto.streamId !== undefined) {
      data.streamId = dto.streamId;
    }

    if (dto.subjectOfferingId !== undefined) {
      data.subjectOfferingId = dto.subjectOfferingId;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.subjectAllocation.update({
        where: { id },
        data,
        select: SUBJECT_ALLOCATION_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This subject is already allocated to that class and stream for the academic year.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Subject allocation not found.');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Stream or subject offering not found or no longer available.',
        );
      }

      throw error;
    }
  }

  /**
   * Verifies the offering belongs to the active school, targets the same
   * academic year and matches the level of the class.
   */
  private async requireOfferingCompatible(
    schoolId: string,
    subjectOfferingId: string,
    academicYearId: string,
    academicLevelId: string,
  ): Promise<void> {
    const offering = await this.prisma.subjectOffering.findFirst({
      where: { id: subjectOfferingId, schoolId },
      select: { id: true, academicYearId: true, academicLevelId: true },
    });

    if (!offering) {
      throw new NotFoundException('Subject offering not found.');
    }

    if (offering.academicYearId !== academicYearId) {
      throw new BadRequestException(
        'The subject offering must belong to the same academic year as the allocation.',
      );
    }

    if (offering.academicLevelId !== academicLevelId) {
      throw new BadRequestException(
        'The subject offering level must match the level of the academic class.',
      );
    }
  }

  private async requireNoDuplicate(
    schoolId: string,
    academicYearId: string,
    academicClassId: string,
    streamId: string | null,
    subjectOfferingId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.subjectAllocation.findFirst({
      where: {
        schoolId,
        academicYearId,
        academicClassId,
        streamId,
        subjectOfferingId,
      },
      select: { id: true },
    });

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        'This subject is already allocated to that class and stream for the academic year.',
      );
    }
  }

  private async requireYearInSchool(
    schoolId: string,
    academicYearId: string,
  ): Promise<void> {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true },
    });

    if (!year) {
      throw new NotFoundException('Academic year not found.');
    }
  }

  private async requireClassInSchool(
    schoolId: string,
    academicClassId: string,
  ): Promise<{ id: string; academicLevelId: string }> {
    const academicClass = await this.prisma.academicClass.findFirst({
      where: { id: academicClassId, schoolId },
      select: { id: true, academicLevelId: true },
    });

    if (!academicClass) {
      throw new NotFoundException('Academic class not found.');
    }

    return academicClass;
  }

  private async requireOfferingInSchool(
    schoolId: string,
    subjectOfferingId: string,
  ): Promise<void> {
    const offering = await this.prisma.subjectOffering.findFirst({
      where: { id: subjectOfferingId, schoolId },
      select: { id: true },
    });

    if (!offering) {
      throw new NotFoundException('Subject offering not found.');
    }
  }

  private async requireStreamInClass(
    classId: string,
    streamId: string,
  ): Promise<void> {
    const stream = await this.prisma.stream.findFirst({
      where: { id: streamId, classId },
      select: { id: true },
    });

    if (!stream) {
      throw new BadRequestException(
        'The specified stream does not belong to the specified class.',
      );
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
