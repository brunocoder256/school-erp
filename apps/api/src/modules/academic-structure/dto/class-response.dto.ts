/**
 * Stable public academic class shape. Classes are the reusable existing
 * model, now tied to a configurable academic level.
 */
export type ClassResponse = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  schoolId: string;
  academicLevelId: string;
  createdAt: Date;
  updatedAt: Date;
};
