/**
 * Stable public department shape. Departments are configurable, optional
 * school structure — a school without departments simply has none.
 */
export type DepartmentResponse = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};