/**
 * Stable public teacher profile shape. Teacher-specific optional information
 * kept separate from the generic staff record.
 */
export type TeacherProfileResponse = {
  id: string;
  staffId: string;
  specialization: string | null;
  yearsOfExperience: number | null;
  professionalQualification: string | null;
  registrationNumber: string | null;
  registrationBody: string | null;
  registrationDate: Date | null;
  registrationExpiryDate: Date | null;
  registrationStatus: string | null;
  highestAcademicQualification: string | null;
  createdAt: Date;
  updatedAt: Date;
};