import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateQualificationDto } from '../dto/create-qualification.dto';
import type { QualificationResponse } from '../dto/qualification-response.dto';
import { UpdateQualificationDto } from '../dto/update-qualification.dto';

const QUALIFICATION_SELECT = {
  id: true,
  staffId: true,
  name: true,
  institution: true,
  qualificationType: true,
  fieldOfStudy: true,
  awardDate: true,
  grade: true,
  certificateNumber: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Staff qualification administration nested under a staff member of the active
 * school. Qualifications are optional structured records; cross-school staff
 * are reported as not found (safe 404).
 */
@Injectable()
export class QualificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    staffId: string,
    dto: CreateQualificationDto,
  ): Promise<QualificationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStaffInSchool(schoolId, staffId);

    try {
      return await this.prisma.staffQualification.create({
        data: {
          staffId,
          name: dto.name.trim(),
          institution: dto.institution?.trim() || null,
          qualificationType: dto.qualificationType?.trim() || null,
          fieldOfStudy: dto.fieldOfStudy?.trim() || null,
          awardDate: dto.awardDate ?? null,
          grade: dto.grade?.trim() || null,
          certificateNumber: dto.certificateNumber?.trim() || null,
        },
        select: QUALIFICATION_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException('Staff member not found.');
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    staffId: string,
  ): Promise<QualificationResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStaffInSchool(schoolId, staffId);

    return this.prisma.staffQualification.findMany({
      where: { staffId },
      select: QUALIFICATION_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(
    activeSchoolId: string | null,
    staffId: string,
    qualificationId: string,
    dto: UpdateQualificationDto,
  ): Promise<QualificationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStaffInSchool(schoolId, staffId);

    const existing = await this.prisma.staffQualification.findFirst({
      where: { id: qualificationId, staffId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Qualification not found.');
    }

    const data: {
      name?: string;
      institution?: string | null;
      qualificationType?: string | null;
      fieldOfStudy?: string | null;
      awardDate?: string | null;
      grade?: string | null;
      certificateNumber?: string | null;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.institution !== undefined) {
      data.institution = dto.institution?.trim() || null;
    }

    if (dto.qualificationType !== undefined) {
      data.qualificationType = dto.qualificationType?.trim() || null;
    }

    if (dto.fieldOfStudy !== undefined) {
      data.fieldOfStudy = dto.fieldOfStudy?.trim() || null;
    }

    if (dto.awardDate !== undefined) {
      data.awardDate = dto.awardDate;
    }

    if (dto.grade !== undefined) {
      data.grade = dto.grade?.trim() || null;
    }

    if (dto.certificateNumber !== undefined) {
      data.certificateNumber = dto.certificateNumber?.trim() || null;
    }

    try {
      return await this.prisma.staffQualification.update({
        where: { id: qualificationId },
        data,
        select: QUALIFICATION_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Qualification not found.');
      }

      throw error;
    }
  }

  async delete(
    activeSchoolId: string | null,
    staffId: string,
    qualificationId: string,
  ): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStaffInSchool(schoolId, staffId);

    const existing = await this.prisma.staffQualification.findFirst({
      where: { id: qualificationId, staffId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Qualification not found.');
    }

    try {
      await this.prisma.staffQualification.delete({
        where: { id: qualificationId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Qualification not found.');
      }

      throw error;
    }
  }

  /**
   * Verifies the parent staff member belongs to the active school (safe 404).
   */
  private async requireStaffInSchool(
    schoolId: string,
    staffId: string,
  ): Promise<void> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, schoolId },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found.');
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