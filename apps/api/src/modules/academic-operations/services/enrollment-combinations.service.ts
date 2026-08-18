import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { EnrollmentCombinationResponse } from '../dto/enrollment-combination-response.dto';
import { SetEnrollmentCombinationDto } from '../dto/set-enrollment-combination.dto';

type EnrollmentContext = {
  id: string;
  studentId: string;
  academicYearId: string;
  academicClassId: string;
  streamId: string | null;
  subjectCombinationId: string | null;
};

/**
 * Connects existing subject combinations to actual student academic
 * enrollment. Setting a combination records it on the enrollment and (by
 * default) bulk-enrolls the combination's subjects in a transaction. Only
 * combination subjects that are offered at the enrollment's level/year and
 * allocated to its class/stream are enrolled; the response reports the final
 * enrolled set.
 */
@Injectable()
export class EnrollmentCombinationsService {
  constructor(private readonly prisma: PrismaService) {}

  async setCombination(
    activeSchoolId: string | null,
    enrollmentId: string,
    dto: SetEnrollmentCombinationDto,
  ): Promise<EnrollmentCombinationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    const enrollment = await this.requireEnrollmentInSchool(
      schoolId,
      enrollmentId,
    );
    const combination = await this.requireCombinationInSchool(
      schoolId,
      dto.subjectCombinationId,
    );

    const academicLevelId = await this.requireEnrollmentLevel(
      schoolId,
      enrollment.academicClassId,
    );

    if (combination.academicLevelId !== academicLevelId) {
      throw new BadRequestException(
        'The subject combination level must match the level of the enrollment class.',
      );
    }

    const combinationSubjects = await this.prisma.subjectCombinationSubject
      .findMany({
        where: { combinationId: combination.id },
        select: { subjectId: true },
        orderBy: { displayOrder: 'asc' },
      });

    return this.prisma.$transaction(async (tx) => {
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { subjectCombinationId: combination.id },
      });

      const enrolledSubjectIds = new Set(
        (
          await tx.studentSubjectEnrollment.findMany({
            where: { enrollmentId },
            select: { subjectId: true },
          })
        ).map((item) => item.subjectId),
      );

      if (dto.enrollSubjects !== false) {
        const availableSubjectIds: string[] = [];

        for (const member of combinationSubjects) {
          const offering = await tx.subjectOffering.findFirst({
            where: {
              schoolId,
              subjectId: member.subjectId,
              academicYearId: enrollment.academicYearId,
              academicLevelId,
            },
            select: { id: true },
          });

          if (!offering) {
            continue;
          }

          const allocation = await tx.subjectAllocation.findFirst({
            where: {
              schoolId,
              academicYearId: enrollment.academicYearId,
              academicClassId: enrollment.academicClassId,
              streamId: enrollment.streamId,
              subjectOfferingId: offering.id,
              isActive: true,
            },
            select: { id: true },
          });

          if (!allocation) {
            continue;
          }

          availableSubjectIds.push(member.subjectId);
        }

        const toCreate = availableSubjectIds.filter(
          (subjectId) => !enrolledSubjectIds.has(subjectId),
        );

        if (toCreate.length > 0) {
          await tx.studentSubjectEnrollment.createMany({
            data: toCreate.map((subjectId) => ({
              enrollmentId,
              subjectId,
              isActive: true,
            })),
          });

          for (const subjectId of toCreate) {
            enrolledSubjectIds.add(subjectId);
          }
        }
      }

      return {
        enrollmentId,
        subjectCombinationId: combination.id,
        code: combination.code,
        name: combination.name,
        subjects: combinationSubjects.map((member) => member.subjectId),
        enrolledSubjectIds: [...enrolledSubjectIds],
      };
    });
  }

  async getCombination(
    activeSchoolId: string | null,
    enrollmentId: string,
  ): Promise<EnrollmentCombinationResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    const enrollment = await this.requireEnrollmentInSchool(
      schoolId,
      enrollmentId,
    );

    if (!enrollment.subjectCombinationId) {
      return {
        enrollmentId,
        subjectCombinationId: null,
        code: null,
        name: null,
        subjects: [],
        enrolledSubjectIds: [],
      };
    }

    const combination = await this.prisma.subjectCombination.findFirst({
      where: { id: enrollment.subjectCombinationId, schoolId },
      select: { id: true, code: true, name: true },
    });

    if (!combination) {
      return {
        enrollmentId,
        subjectCombinationId: null,
        code: null,
        name: null,
        subjects: [],
        enrolledSubjectIds: [],
      };
    }

    const subjects = await this.prisma.subjectCombinationSubject.findMany({
      where: { combinationId: combination.id },
      select: { subjectId: true },
      orderBy: { displayOrder: 'asc' },
    });

    const enrolled = await this.prisma.studentSubjectEnrollment.findMany({
      where: { enrollmentId },
      select: { subjectId: true },
    });

    return {
      enrollmentId,
      subjectCombinationId: combination.id,
      code: combination.code,
      name: combination.name,
      subjects: subjects.map((member) => member.subjectId),
      enrolledSubjectIds: enrolled.map((item) => item.subjectId),
    };
  }

  private async requireEnrollmentInSchool(
    schoolId: string,
    enrollmentId: string,
  ): Promise<EnrollmentContext> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId },
      select: {
        id: true,
        studentId: true,
        academicYearId: true,
        academicClassId: true,
        streamId: true,
        subjectCombinationId: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    const student = await this.prisma.student.findFirst({
      where: { id: enrollment.studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Enrollment not found.');
    }

    return enrollment;
  }

  private async requireCombinationInSchool(
    schoolId: string,
    subjectCombinationId: string,
  ): Promise<{ id: string; code: string; name: string; academicLevelId: string }> {
    const combination = await this.prisma.subjectCombination.findFirst({
      where: { id: subjectCombinationId, schoolId },
      select: { id: true, code: true, name: true, academicLevelId: true },
    });

    if (!combination) {
      throw new NotFoundException('Subject combination not found.');
    }

    return combination;
  }

  private async requireEnrollmentLevel(
    schoolId: string,
    academicClassId: string,
  ): Promise<string> {
    const academicClass = await this.prisma.academicClass.findFirst({
      where: { id: academicClassId, schoolId },
      select: { id: true, academicLevelId: true },
    });

    if (!academicClass) {
      throw new NotFoundException('Academic class not found.');
    }

    return academicClass.academicLevelId;
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
