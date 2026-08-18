/**
 * Stable public teacher subject capability shape. Represents "teacher can
 * teach subject" (capability), not a current teaching assignment.
 */
export type SubjectCapabilityResponse = {
  id: string;
  staffId: string;
  subjectId: string;
  isPrimary: boolean;
  createdAt: Date;
};