import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { MembershipStatus } from '../../../../generated/prisma/enums';

export const SCHOOL_ADMIN_ROLE = 'SCHOOL_ADMIN';

/**
 * Rejects an operation that would leave the school without at least one
 * active school administrator.
 *
 * A user counts as an active school administrator when they hold the seeded
 * SCHOOL_ADMIN role for the school AND have an ACTIVE SchoolMembership there.
 *
 * This is the smallest safe self-protection rule: deactivating the last active
 * administrator's membership, or revoking the last active administrator's
 * SCHOOL_ADMIN role, would leave the school unmanageable.
 */
export async function assertNotLastActiveSchoolAdmin(
  prisma: Prisma.TransactionClient,
  schoolId: string,
  targetUserId: string,
): Promise<void> {
  const adminUserRoles = await prisma.userRole.findMany({
    where: {
      schoolId,
      role: { name: SCHOOL_ADMIN_ROLE },
      user: {
        memberships: {
          some: {
            schoolId,
            status: MembershipStatus.ACTIVE,
          },
        },
      },
    },
    select: { userId: true },
  });

  const otherAdmins = adminUserRoles.filter(
    (item) => item.userId !== targetUserId,
  );

  if (otherAdmins.length === 0) {
    throw new ForbiddenException(
      'This action would leave the school without an active administrator.',
    );
  }
}
