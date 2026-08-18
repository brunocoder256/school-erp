/**
 * A subject member of a subject combination.
 */
export type CombinationSubjectItem = {
  subjectId: string;
  isRequired: boolean;
  displayOrder: number;
};

/**
 * Stable public subject combination / pathway shape. Combinations (PCM, PCB,
 * ...) are configurable data of the active school, never hard-coded.
 */
export type SubjectCombinationResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  minSubjects: number | null;
  maxSubjects: number | null;
  isActive: boolean;
  schoolId: string;
  academicLevelId: string;
  createdAt: Date;
  updatedAt: Date;
  subjects: CombinationSubjectItem[];
};