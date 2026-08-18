import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { TeacherProfileResponse } from '../dto/teacher-profile-response.dto';
import { UpsertTeacherProfileDto } from '../dto/upsert-teacher-profile.dto';

const TEACHER_PROFILE_SELECT = {
  id: true,
  staffId: true,
  specialization: true,
  yearsOfExperience: true,
  professionalQualification: true,
  registrationNumber: true,
  registrationBody: true,
  registrationDate: true,
  registrationExpiryDate: true,
  registrationStatus: true,
  highestAcademicQualification: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Teacher profile administration nested under a staff member of the active
 * school.
 *
 * A teacher is a specialization of staff, not a replacement for Staff. The
 * profile holds only optional teacher-specific information. Any staff member
 * of the active school may hold a profile; cross-school staff are reported as
 * not found (safe 404). The profile is created on first write (upsert).
 */
@Injectable()
export class TeacherProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    activeSchoolId: string | null,
    staffId: string,
  ): Promise<TeacherProfileResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStaffInSchool(schoolId, staffId);

    const profile = await this.prisma.teacherProfile.findFirst({
      where: { staffId },
      select: TEACHER_PROFILE_SELECT,
    });

    if (!profile) {
      throw new NotFoundException('Teacher profile not found.');
    }

    return profile;
  }

  async upsert(
    activeSchoolId: string | null,
    staffId: string,
    dto: UpsertTeacherProfileDto,
  ): Promise<TeacherProfileResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStaffInSchool(schoolId, staffId);

    const createData: Prisma.TeacherProfileCreateInput = {
      staff: { connect: { id: staffId } },
      specialization: dto.specialization?.trim() || null,
      yearsOfExperience: dto.yearsOfExperience ?? null,
      professionalQualification: dto.professionalQualification?.trim() || null,
      registrationNumber: dto.registrationNumber?.trim() || null,
      registrationBody: dto.registrationBody?.trim() || null,
      registrationDate: dto.registrationDate ?? null,
      registrationExpiryDate: dto.registrationExpiryDate ?? null,
      registrationStatus: dto.registrationStatus?.trim() || null,
      highestAcademicQualification:
        dto.highestAcademicQualification?.trim() || null,
    };

    const updateData: Prisma.TeacherProfileUpdateInput = {};

    if (dto.specialization !== undefined) {
      updateData.specialization = dto.specialization?.trim() || null;
    }

    if (dto.yearsOfExperience !== undefined) {
      updateData.yearsOfExperience = dto.yearsOfExperience;
    }

    if (dto.professionalQualification !== undefined) {
      updateData.professionalQualification =
        dto.professionalQualification?.trim() || null;
    }

    if (dto.registrationNumber !== undefined) {
      updateData.registrationNumber = dto.registrationNumber?.trim() || null;
    }

    if (dto.registrationBody !== undefined) {
      updateData.registrationBody = dto.registrationBody?.trim() || null;
    }

    if (dto.registrationDate !== undefined) {
      updateData.registrationDate = dto.registrationDate;
    }

    if (dto.registrationExpiryDate !== undefined) {
      updateData.registrationExpiryDate = dto.registrationExpiryDate;
    }

    if (dto.registrationStatus !== undefined) {
      updateData.registrationStatus = dto.registrationStatus?.trim() || null;
    }

    if (dto.highestAcademicQualification !== undefined) {
      updateData.highestAcademicQualification =
        dto.highestAcademicQualification?.trim() || null;
    }

    try {
      return await this.prisma.teacherProfile.upsert({
        where: { staffId },
        create: createData,
        update: updateData,
        select: TEACHER_PROFILE_SELECT,
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