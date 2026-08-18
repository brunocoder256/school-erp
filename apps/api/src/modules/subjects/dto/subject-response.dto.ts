/**
 * Stable public subject / learning-area shape. Subjects (Mathematics,
 * Biology, Luganda, ...) are configurable data of the active school.
 */
export type SubjectResponse = {
  id: string;
  name: string;
  code: string;
  shortName: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  schoolId: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
};