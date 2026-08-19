import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedUser } from '../../identity/types/authenticated-request';

export function requireActiveSchoolId(activeSchoolId: string | null): string {
  if (!activeSchoolId) {
    throw new ForbiddenException(
      'Active school context is required for this operation.',
    );
  }

  return activeSchoolId;
}

export interface AssessmentContextRef {
  schoolId: string;
  academicYearId: string;
  subjectId: string;
  academicClassId: string;
  streamId: string | null;
}

/**
 * Score entry and result submission are restricted to school administrators
 * and to teachers who hold an active teaching assignment that matches the
 * assessment context. The `results.approve` permission acts as the
 * administrator discriminator because it is only granted to admins.
 */
export async function requireTeacherAssignmentContext(
  prisma: PrismaService,
  user: AuthenticatedUser,
  context: AssessmentContextRef,
): Promise<void> {
  if (user.permissionKeys.includes('results.approve')) {
    return;
  }

  const staff = await prisma.staff.findFirst({
    where: { userId: user.id, schoolId: context.schoolId },
    select: { id: true },
  });

  if (!staff) {
    throw new ForbiddenException(
      'Only administrators or assigned teachers may record scores for this assessment.',
    );
  }

  const assignment = await prisma.teachingAssignment.findFirst({
    where: {
      staffId: staff.id,
      schoolId: context.schoolId,
      academicYearId: context.academicYearId,
      subjectId: context.subjectId,
      academicClassId: context.academicClassId,
      streamId: context.streamId ?? null,
      isActive: true,
    },
    select: { id: true },
  });

  if (!assignment) {
    throw new ForbiddenException(
      'You are not assigned to teach this assessment context.',
    );
  }
}