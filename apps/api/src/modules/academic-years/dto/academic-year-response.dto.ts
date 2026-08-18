/**
 * Stable public academic year shape — no memberships, roles, or internal
 * relations. The school is always the authenticated active school.
 */
export type AcademicYearResponse = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};
