/**
 * Stable public education section shape. The school is always the
 * authenticated active school.
 */
export type SectionResponse = {
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
