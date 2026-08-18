/**
 * Stable public academic level shape. Levels such as N1-N3, P1-P7 and S1-S6
 * are configurable data records of the active school.
 */
export type LevelResponse = {
  id: string;
  name: string;
  code: string;
  levelNumber: number;
  description: string | null;
  displayOrder: number;
  canEnroll: boolean;
  isTerminal: boolean;
  isActive: boolean;
  schoolId: string;
  sectionId: string;
  academicOrganizationId: string;
  createdAt: Date;
  updatedAt: Date;
};
