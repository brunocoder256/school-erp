export { apiRequest, toQueryString } from "@/features/academic/api/client";
export type { QueryParams } from "@/features/academic/api/client";

export {
  listAcademicYears,
  getAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  listTerms,
  getTerm,
  createTerm,
  updateTerm,
  deleteTerm,
} from "@/features/academic/api/academic-years";

export {
  sectionsApi,
  organizationsApi,
  levelsApi,
  classesApi,
  streamsApi,
  progressionsApi,
} from "@/features/academic/api/academic-structure";

export {
  subjectCategoriesApi,
  subjectsApi,
  subjectOfferingsApi,
  subjectCombinationsApi,
} from "@/features/academic/api/subjects";

export {
  subjectAllocationsApi,
  teachingGroupsApi,
  studentSubjectsApi,
  enrollmentCombinationsApi,
  teachingAssignmentsApi,
} from "@/features/academic/api/operations";

export { staffApi, listStaff, getStaffDetail } from "@/features/academic/api/staff";
export { studentsApi, enrollmentsApi } from "@/features/academic/api/students";
