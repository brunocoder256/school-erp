export interface AcademicAggregate {
  schoolId: string;
  academicYearId?: string;
  termId?: string;
  subjectId?: string;
  studentStatus?: string;

  resultCount: number;
  enrollmentCount: number;
  studentCount: number;

  subjectStats: Array<{
    subjectId: string;
    passed: number;
    total: number;
    averageScore: number;
  }>;

  classStats: Array<{
    academicClassId: string;
    passed: number;
    total: number;
    averageScore: number;
  }>;

  streamStats: Array<{
    streamId: string;
    passed: number;
    total: number;
    averageScore: number;
  }>;

  students: Array<{
    id: string;
    admissionNumber: string;
    status: string;
  }>;
}