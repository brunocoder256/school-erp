/**
 * Stable public term shape — the parent academic year is always within the
 * authenticated active school (verified through the academic year relation).
 */
export type TermResponse = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  academicYearId: string;
  createdAt: Date;
  updatedAt: Date;
};
