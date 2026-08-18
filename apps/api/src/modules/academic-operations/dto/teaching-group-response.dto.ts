import type { Gender } from '../../../../generated/prisma/enums';

/**
 * Stable public teaching group shape. A group is a stable operational unit for
 * subject X in year Y for class Z (optionally a stream); teaching assignments
 * aggregate into groups and students resolve from the class/stream context.
 */
export type TeachingGroupResponse = {
  id: string;
  name: string | null;
  isActive: boolean;
  schoolId: string;
  academicYearId: string;
  academicClassId: string;
  streamId: string | null;
  subjectId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TeachingGroupStudentResponse = {
  enrollmentId: string;
  student: {
    id: string;
    admissionNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    preferredName: string | null;
    gender: Gender;
  };
};
