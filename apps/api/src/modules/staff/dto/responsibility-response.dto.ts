/**
 * Stable public staff responsibility shape. Configurable responsibility type
 * (class teacher, form teacher, head of department, ...) scoped to an academic
 * year with optional class/stream/department targets.
 */
export type ResponsibilityResponse = {
  id: string;
  staffId: string;
  type: string;
  isActive: boolean;
  academicYearId: string;
  classId: string | null;
  streamId: string | null;
  departmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};