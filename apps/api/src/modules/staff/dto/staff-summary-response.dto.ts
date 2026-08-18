import type { StaffStatus } from '../../../../generated/prisma/enums';

/**
 * Lean staff summary returned by list endpoints. Deliberately excludes
 * sensitive personal fields (nationalId, address, contact details, notes)
 * which are only exposed through the detail endpoint.
 */
export type StaffSummaryResponse = {
  id: string;
  staffNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  employmentStatus: StaffStatus;
  employmentType: string | null;
  staffCategoryId: string | null;
  departmentId: string | null;
  positionId: string | null;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};
