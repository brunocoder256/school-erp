import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSubjectOfferingDto } from '../dto/create-subject-offering.dto';
import type { SubjectOfferingResponse } from '../dto/subject-offering-response.dto';
import { UpdateSubjectOfferingDto } from '../dto/update-subject-offering.dto';

const SUBJECT_OFFERING_SELECT = {
  id: true,
  isActive: true,
  schoolId: true,
  subjectId: true,
  academicLevelId: true,
  academicYearId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Subject offering administration within the active school context.
 *
 * An offering is "subject X offered at level Y during academic year Z". It is
 * deliberately distinct from the subject catalog and from learner subject
 * selections. Every referenced entity must belong to the active school
 * (safe 404).
 */
@Injectable()
export class SubjectOfferingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateSubjectOfferingDto,
  ): Promise<SubjectOfferingResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireSubjectInSchool(schoolId, dto.subjectId);
    await this.requireLevelInSchool(schoolId, dto.academicLevelId);
    await this.requireAcademicYearInSchool(schoolId, dto.academicYearId);

    const existing = await this.prisma.subjectOffering.findFirst({
      where: {
        schoolId,
        subjectId: dto.subjectId,
        academicLevelId: dto.academicLevelId,
        academicYearId: dto.academicYearId,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'This subject is already offered for that level and academic year.',
      );
    }

    try {
      return await this.prisma.subjectOffering.create({
        data: {
          schoolId,
          subjectId: dto.subjectId,
          academicLevelId: dto.academicLevelId,
          academicYearId: dto.academicYearId,
          isActive: dto.isActive ?? true,
        },
        select: SUBJECT_OFFERING_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This subject is already offered for that level and academic year.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Subject, academic level or academic year not found or no longer available.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
  ): Promise<SubjectOfferingResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    return this.prisma.subjectOffering.findMany({
      where: { schoolId },
      select: SUBJECT_OFFERING_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<SubjectOfferingResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const offering = await this.prisma.subjectOffering.findFirst({
      where: { id, schoolId },
      select: SUBJECT_OFFERING_SELECT,
    });

    if (!offering) {
      throw new NotFoundException('Subject offering not found.');
    }

    return offering;
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateSubjectOfferingDto,
  ): Promise<SubjectOfferingResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.subjectOffering.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        subjectId: true,
        academicLevelId: true,
        academicYearId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Subject offering not found.');
    }

    const subjectId = dto.subjectId ?? existing.subjectId;
    const academicLevelId = dto.academicLevelId ?? existing.academicLevelId;
    const academicYearId = dto.academicYearId ?? existing.academicYearId;

    if (dto.subjectId !== undefined) {
      await this.requireSubjectInSchool(schoolId, dto.subjectId);
    }

    if (dto.academicLevelId !== undefined) {
      await this.requireLevelInSchool(schoolId, dto.academicLevelId);
    }

    if (dto.academicYearId !== undefined) {
      await this.requireAcademicYearInSchool(schoolId, dto.academicYearId);
    }

    const duplicate = await this.prisma.subjectOffering.findFirst({
      where: {
        schoolId,
        subjectId,
        academicLevelId,
        academicYearId,
      },
      select: { id: true },
    });

    if (duplicate && duplicate.id !== id) {
      throw new ConflictException(
        'This subject is already offered for that level and academic year.',
      );
    }

    const data: {
      subjectId?: string;
      academicLevelId?: string;
      academicYearId?: string;
      isActive?: boolean;
    } = {};

    if (dto.subjectId !== undefined) {
      data.subjectId = dto.subjectId;
    }

    if (dto.academicLevelId !== undefined) {
      data.academicLevelId = dto.academicLevelId;
    }

    if (dto.academicYearId !== undefined) {
      data.academicYearId = dto.academicYearId;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.subjectOffering.update({
        where: { id },
        data,
        select: SUBJECT_OFFERING_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This subject is already offered for that level and academic year.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Subject offering not found.');
      }

      throw error;
    }
  }

  async delete(activeSchoolId: string | null, id: string): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.subjectOffering.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Subject offering not found.');
    }

    try {
      await this.prisma.subjectOffering.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Subject offering not found.');
      }

      throw error;
    }
  }

  private async requireSubjectInSchool(
    schoolId: string,
    subjectId: string,
  ): Promise<void> {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: { id: true },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found.');
    }
  }

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

  private async requireAcademicYearInSchool(
    schoolId: string,
    academicYearId: string,
  ): Promise<void> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found.');
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