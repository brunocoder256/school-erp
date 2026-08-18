import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSubjectCapabilityDto } from '../dto/create-subject-capability.dto';
import type { SubjectCapabilityResponse } from '../dto/subject-capability-response.dto';

const SUBJECT_CAPABILITY_SELECT = {
  id: true,
  staffId: true,
  subjectId: true,
  isPrimary: true,
  createdAt: true,
};

/**
 * Teacher subject capability administration nested under a staff member of the
 * active school. Capability ("can teach X") is separate from current
 * assignments ("currently teaches X") — the two relationships are never
 * collapsed. The subject must belong to the active school.
 */
@Injectable()
export class SubjectCapabilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    staffId: string,
    dto: CreateSubjectCapabilityDto,
  ): Promise<SubjectCapabilityResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStaffInSchool(schoolId, staffId);
    await this.requireSubjectInSchool(schoolId, dto.subjectId);

    const existing = await this.prisma.teacherSubjectCapability.findFirst({
      where: { staffId, subjectId: dto.subjectId },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'This staff member already has a capability for that subject.',
      );
    }

    try {
      return await this.prisma.teacherSubjectCapability.create({
        data: {
          staffId,
          subjectId: dto.subjectId,
          isPrimary: dto.isPrimary ?? false,
        },
        select: SUBJECT_CAPABILITY_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This staff member already has a capability for that subject.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException('Staff member or subject not found.');
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    staffId: string,
  ): Promise<SubjectCapabilityResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStaffInSchool(schoolId, staffId);

    return this.prisma.teacherSubjectCapability.findMany({
      where: { staffId },
      select: SUBJECT_CAPABILITY_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async delete(
    activeSchoolId: string | null,
    staffId: string,
    capabilityId: string,
  ): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStaffInSchool(schoolId, staffId);

    const existing = await this.prisma.teacherSubjectCapability.findFirst({
      where: { id: capabilityId, staffId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Subject capability not found.');
    }

    try {
      await this.prisma.teacherSubjectCapability.delete({
        where: { id: capabilityId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Subject capability not found.');
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