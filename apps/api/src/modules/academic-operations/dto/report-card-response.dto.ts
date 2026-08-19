import type { ReportCardStatus } from '../../../../generated/prisma/enums';

export type ReportCardLineResponse = {
  id: string;
  reportCardId: string;
  subjectId: string;
  score: number | null;
  grade: string | null;
  isPassed: boolean;
  teacherComment: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReportCardResponse = {
  id: string;
  schoolId: string;
  studentId: string;
  enrollmentId: string;
  academicYearId: string;
  academicClassId: string | null;
  streamId: string | null;
  averageScore: number | null;
  overallGrade: string | null;
  status: ReportCardStatus;
  remarks: string | null;
  generatedAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lines: ReportCardLineResponse[];
};
