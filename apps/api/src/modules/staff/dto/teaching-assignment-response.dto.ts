/**
 * Stable public teaching assignment shape. Connects a staff member (teacher)
 * to an academic year, subject and academic class with an optional stream.
 * Historical assignments remain queryable.
 */
export type TeachingAssignmentResponse = {
  id: string;
  staffId: string;
  academicYearId: string;
  subjectId: string;
  academicClassId: string;
  streamId: string | null;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};