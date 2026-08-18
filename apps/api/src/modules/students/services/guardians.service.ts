import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { GuardianRelationshipType } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import type { GuardianResponse } from '../dto/guardian-response.dto';
import { CreateGuardianDto } from '../dto/create-guardian.dto';
import { UpdateGuardianDto } from '../dto/update-guardian.dto';

const GUARDIAN_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  alternatePhone: true,
  email: true,
  address: true,
  occupation: true,
  preferredContactMethod: true,
  createdAt: true,
  updatedAt: true,
};

const GUARDIAN_LINK_SELECT = {
  relationshipType: true,
  isPrimary: true,
  isEmergencyContact: true,
  isAuthorizedPickup: true,
  guardian: { select: GUARDIAN_SELECT },
};

type GuardianLink = {
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  isAuthorizedPickup: boolean;
  guardian: {
    id: string;
    fullName: string;
    phone: string | null;
    alternatePhone: string | null;
    email: string | null;
    address: string | null;
    occupation: string | null;
    preferredContactMethod: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

/**
 * Guardian administration within the active school context.
 *
 * Guardians carry their own schoolId. A guardian is only ever linked to
 * students of the same school, and every query is scoped through
 * schoolId = activeSchoolId, so guardians of another school are
 * indistinguishable from nonexistent ones (safe 404).
 */
@Injectable()
export class GuardiansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    studentId: string,
    dto: CreateGuardianDto,
  ): Promise<GuardianResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStudentInSchool(schoolId, studentId);

    const fullName = dto.fullName.trim();
    const phone = dto.phone?.trim() || null;

    return this.prisma.$transaction(async (tx) => {
      const existing = phone
        ? await tx.guardian.findFirst({
            where: { schoolId, fullName, phone },
            select: { id: true },
          })
        : null;

      const guardianId = existing
        ? existing.id
        : (
            await tx.guardian.create({
              data: {
                schoolId,
                fullName,
                phone,
                alternatePhone: dto.alternatePhone?.trim() || null,
                email: dto.email?.trim().toLowerCase() || null,
                address: dto.address?.trim() || null,
                occupation: dto.occupation?.trim() || null,
                preferredContactMethod:
                  dto.preferredContactMethod?.trim() || null,
              },
              select: { id: true },
            })
          ).id;

      try {
        const link = await tx.studentGuardian.create({
          data: {
            studentId,
            guardianId,
            relationshipType: dto.relationshipType,
            isPrimary: dto.isPrimary ?? false,
            isEmergencyContact: dto.isEmergencyContact ?? false,
            isAuthorizedPickup: dto.isAuthorizedPickup ?? false,
          },
          select: GUARDIAN_LINK_SELECT,
        });

        if (link.isPrimary) {
          await tx.studentGuardian.updateMany({
            where: { studentId, guardianId: { not: guardianId } },
            data: { isPrimary: false },
          });
        }

        return this.toGuardianResponse(link);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'This guardian is already associated with this student.',
          );
        }

        throw error;
      }
    });
  }

  async listByStudent(
    activeSchoolId: string | null,
    studentId: string,
  ): Promise<GuardianResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStudentInSchool(schoolId, studentId);

    const links = await this.prisma.studentGuardian.findMany({
      where: { studentId },
      select: GUARDIAN_LINK_SELECT,
      orderBy: { createdAt: 'asc' },
    });

    return links.map((link) => this.toGuardianResponse(link));
  }

  async update(
    activeSchoolId: string | null,
    studentId: string,
    guardianId: string,
    dto: UpdateGuardianDto,
  ): Promise<GuardianResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStudentInSchool(schoolId, studentId);

    const link = await this.prisma.studentGuardian.findFirst({
      where: { studentId, guardianId, guardian: { schoolId } },
      select: { id: true },
    });

    if (!link) {
      throw new NotFoundException('Guardian not found for this student.');
    }

    return this.prisma.$transaction(async (tx) => {
      const guardianData: {
        fullName?: string;
        phone?: string | null;
        alternatePhone?: string | null;
        email?: string | null;
        address?: string | null;
        occupation?: string | null;
        preferredContactMethod?: string | null;
      } = {};

      if (dto.fullName !== undefined) {
        guardianData.fullName = dto.fullName.trim();
      }

      if (dto.phone !== undefined) {
        guardianData.phone = dto.phone?.trim() || null;
      }

      if (dto.alternatePhone !== undefined) {
        guardianData.alternatePhone = dto.alternatePhone?.trim() || null;
      }

      if (dto.email !== undefined) {
        guardianData.email = dto.email?.trim().toLowerCase() || null;
      }

      if (dto.address !== undefined) {
        guardianData.address = dto.address?.trim() || null;
      }

      if (dto.occupation !== undefined) {
        guardianData.occupation = dto.occupation?.trim() || null;
      }

      if (dto.preferredContactMethod !== undefined) {
        guardianData.preferredContactMethod =
          dto.preferredContactMethod?.trim() || null;
      }

      await tx.guardian.update({
        where: { id: guardianId },
        data: guardianData,
      });

      const linkData: {
        relationshipType?: GuardianRelationshipType;
        isPrimary?: boolean;
        isEmergencyContact?: boolean;
        isAuthorizedPickup?: boolean;
      } = {};

      if (dto.relationshipType !== undefined) {
        linkData.relationshipType = dto.relationshipType;
      }

      if (dto.isPrimary !== undefined) {
        linkData.isPrimary = dto.isPrimary;
      }

      if (dto.isEmergencyContact !== undefined) {
        linkData.isEmergencyContact = dto.isEmergencyContact;
      }

      if (dto.isAuthorizedPickup !== undefined) {
        linkData.isAuthorizedPickup = dto.isAuthorizedPickup;
      }

      await tx.studentGuardian.update({
        where: { id: link.id },
        data: linkData,
      });

      if (linkData.isPrimary === true) {
        await tx.studentGuardian.updateMany({
          where: { studentId, guardianId: { not: guardianId } },
          data: { isPrimary: false },
        });
      }

      const updated = await tx.studentGuardian.findFirst({
        where: { id: link.id },
        select: GUARDIAN_LINK_SELECT,
      });

      if (!updated) {
        throw new NotFoundException('Guardian not found for this student.');
      }

      return this.toGuardianResponse(updated);
    });
  }

  async delete(
    activeSchoolId: string | null,
    studentId: string,
    guardianId: string,
  ): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireStudentInSchool(schoolId, studentId);

    const link = await this.prisma.studentGuardian.findFirst({
      where: { studentId, guardianId, guardian: { schoolId } },
      select: { id: true },
    });

    if (!link) {
      throw new NotFoundException('Guardian not found for this student.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.studentGuardian.delete({ where: { id: link.id } });

      const remaining = await tx.studentGuardian.count({
        where: { guardianId },
      });

      if (remaining === 0) {
        await tx.guardian
          .delete({ where: { id: guardianId } })
          .catch((error: unknown) => {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2025'
            ) {
              return;
            }

            throw error;
          });
      }
    });
  }

  /**
   * Verifies the parent student belongs to the active school before any
   * guardian-level query runs. Cross-school students are indistinguishable
   * from nonexistent ones (safe 404).
   */
  private async requireStudentInSchool(
    schoolId: string,
    studentId: string,
  ): Promise<void> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found.');
    }
  }

  private toGuardianResponse(link: GuardianLink): GuardianResponse {
    return {
      id: link.guardian.id,
      fullName: link.guardian.fullName,
      phone: link.guardian.phone,
      alternatePhone: link.guardian.alternatePhone,
      email: link.guardian.email,
      address: link.guardian.address,
      occupation: link.guardian.occupation,
      preferredContactMethod: link.guardian.preferredContactMethod,
      relationshipType: link.relationshipType,
      isPrimary: link.isPrimary,
      isEmergencyContact: link.isEmergencyContact,
      isAuthorizedPickup: link.isAuthorizedPickup,
      createdAt: link.guardian.createdAt,
      updatedAt: link.guardian.updatedAt,
    };
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
