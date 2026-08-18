import type {
  AdmissionType,
  BoardingStatus,
  EnrollmentStatus,
} from '../../../../generated/prisma/enums';

/**
 * Stable public enrollment shape — tenant is always the active school.
 */
export type EnrollmentResponse = {
  id: string;
  studentId: string;
  academicYearId: string;
  academicClassId: string;
  streamId: string | null;
  status: EnrollmentStatus;
  enrollmentDate: Date;
  admissionType: AdmissionType;
  previousSchool: string | null;
  previousClass: string | null;
  boardingStatus: BoardingStatus | null;
  house: string | null;
  remarks: string | null;
  withdrawalDate: Date | null;
  withdrawalReason: string | null;
  completedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
