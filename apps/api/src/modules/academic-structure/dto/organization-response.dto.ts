/**
 * Stable public academic organization shape. Organization models are
 * configurable data (e.g. Thematic, Subject-based, Competency-based) that a
 * school assigns to each academic level.
 */
export type OrganizationResponse = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};
