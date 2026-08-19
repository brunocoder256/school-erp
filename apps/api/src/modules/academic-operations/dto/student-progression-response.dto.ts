import type {
  ProgressionDecision,
} from '../../../../generated/prisma/enums';

export type StudentProgressionResponse = {
  id: string;
  schoolId: string;
  studentId: string;
  enrollmentId: string;
  academicYearId: string;
  reportCardId: string | null;
  decision: ProgressionDecision;
  recommendation: string | null;
  effectiveDate: Date | null;
  fromAcademicLevelId: string | null;
  toAcademicLevelId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
