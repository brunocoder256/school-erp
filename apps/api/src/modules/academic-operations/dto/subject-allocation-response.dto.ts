/**
 * Stable public subject allocation shape. An allocation answers "this subject
 * offering is taught in this class/stream during this academic year". A null
 * stream means the whole class.
 */
export type SubjectAllocationResponse = {
  id: string;
  isActive: boolean;
  schoolId: string;
  academicYearId: string;
  academicClassId: string;
  streamId: string | null;
  subjectOfferingId: string;
  createdAt: Date;
  updatedAt: Date;
};
