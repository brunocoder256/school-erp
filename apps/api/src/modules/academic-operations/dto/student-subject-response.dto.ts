/**
 * Stable public student subject enrollment shape. Connects a student's
 * academic enrollment to a subject; the tenant relationship is resolved
 * through enrollment → student → school.
 */
export type StudentSubjectResponse = {
  id: string;
  isActive: boolean;
  enrollmentId: string;
  subjectId: string;
  createdAt: Date;
  updatedAt: Date;
};
