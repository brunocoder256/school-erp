/**
 * Stable public subject category shape. Categories (Core, Elective, ...) are
 * configurable data of the active school, never hard-coded clusters.
 */
export type SubjectCategoryResponse = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};