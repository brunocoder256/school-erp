/**
 * Stable public academic level progression shape. Progression is a
 * configurable relationship (P7 -> S1, S1 -> S2, ...) — never hard-coded
 * logic.
 */
export type ProgressionResponse = {
  id: string;
  fromLevelId: string;
  toLevelId: string;
  displayOrder: number;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};
