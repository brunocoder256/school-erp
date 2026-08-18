import type { Gender, StaffStatus } from '../../../../generated/prisma/enums';

/**
 * Full staff detail returned by the single-record endpoint. Contains
 * personal/contact data that is intentionally omitted from list responses.
 */
export type StaffDetailResponse = {
  id: string;
  staffNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  alternativePhone: string | null;
  dateOfBirth: Date | null;
  gender: Gender | null;
  nationalId: string | null;
  address: string | null;
  employmentStatus: StaffStatus;
  employmentType: string | null;
  joiningDate: Date | null;
  leavingDate: Date | null;
  notes: string | null;
  staffCategoryId: string | null;
  departmentId: string | null;
  positionId: string | null;
  userId: string | null;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};
