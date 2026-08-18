/**
 * Stable public staff qualification shape. A staff member may hold multiple
 * qualifications; every field except the name is optional.
 */
export type QualificationResponse = {
  id: string;
  staffId: string;
  name: string;
  institution: string | null;
  qualificationType: string | null;
  fieldOfStudy: string | null;
  awardDate: Date | null;
  grade: string | null;
  certificateNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
};