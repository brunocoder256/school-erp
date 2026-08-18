import type { Gender, StudentStatus } from '../../../../generated/prisma/enums';

/**
 * Stable public student shape — no enrollments, guardians, or internal
 * relations. The school is always the authenticated active school.
 */
export type StudentResponse = {
  id: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  gender: Gender;
  dateOfBirth: Date;
  placeOfBirth: string | null;
  nationality: string | null;
  religion: string | null;
  profilePhotoUrl: string | null;
  nationalId: string | null;
  birthCertificateNumber: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  municipality: string | null;
  village: string | null;
  status: StudentStatus;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};
