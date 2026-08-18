/**
 * Stable public staff position shape. Positions are configurable, optional
 * designations — a school defines its own (or none).
 */
export type StaffPositionResponse = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
};