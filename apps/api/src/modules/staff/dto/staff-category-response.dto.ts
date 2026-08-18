/**
 * Stable public staff category shape. Categories are configurable, optional
 * staff classification — a school defines its own categories (or none).
 */
export type StaffCategoryResponse = {
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