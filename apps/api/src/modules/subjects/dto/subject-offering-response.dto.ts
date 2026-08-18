/**
 * Stable public subject offering shape. An offering is "subject X offered at
 * level Y during academic year Z" — distinct from the subject catalog and
 * from any individual learner's subject selection.
 */
export type SubjectOfferingResponse = {
  id: string;
  isActive: boolean;
  schoolId: string;
  subjectId: string;
  academicLevelId: string;
  academicYearId: string;
  createdAt: Date;
  updatedAt: Date;
};