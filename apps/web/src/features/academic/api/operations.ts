import {
  apiRequest,
  toQueryString,
  type QueryParams,
} from "@/features/academic/api/client";
import type {
  CreateStudentSubjectDto,
  CreateSubjectAllocationDto,
  CreateTeachingAssignmentDto,
  CreateTeachingGroupDto,
  EnrollmentCombinationResponse,
  ListStudentSubjectsQueryDto,
  ListSubjectAllocationsQueryDto,
  ListTeachingGroupsQueryDto,
  SetEnrollmentCombinationDto,
  StudentSubjectResponse,
  SubjectAllocationResponse,
  TeachingAssignmentResponse,
  TeachingGroupResponse,
  TeachingGroupStudentResponse,
  UpdateStudentSubjectDto,
  UpdateSubjectAllocationDto,
  UpdateTeachingAssignmentDto,
  UpdateTeachingGroupDto,
} from "@/types/academic";

export const subjectAllocationsApi = {
  list(params: ListSubjectAllocationsQueryDto = {}) {
    return apiRequest<SubjectAllocationResponse[]>(
      `/api/v1/subject-allocations${toQueryString(params)}`,
    );
  },
  get(id: string) {
    return apiRequest<SubjectAllocationResponse>(
      `/api/v1/subject-allocations/${id}`,
    );
  },
  create(dto: CreateSubjectAllocationDto) {
    return apiRequest<SubjectAllocationResponse, CreateSubjectAllocationDto>(
      "/api/v1/subject-allocations",
      { method: "POST", body: dto },
    );
  },
  update(id: string, dto: UpdateSubjectAllocationDto) {
    return apiRequest<SubjectAllocationResponse, UpdateSubjectAllocationDto>(
      `/api/v1/subject-allocations/${id}`,
      { method: "PATCH", body: dto },
    );
  },
};

export const teachingGroupsApi = {
  list(params: ListTeachingGroupsQueryDto = {}) {
    return apiRequest<TeachingGroupResponse[]>(
      `/api/v1/teaching-groups${toQueryString(params)}`,
    );
  },
  get(id: string) {
    return apiRequest<TeachingGroupResponse>(
      `/api/v1/teaching-groups/${id}`,
    );
  },
  students(id: string) {
    return apiRequest<TeachingGroupStudentResponse[]>(
      `/api/v1/teaching-groups/${id}/students`,
    );
  },
  create(dto: CreateTeachingGroupDto) {
    return apiRequest<TeachingGroupResponse, CreateTeachingGroupDto>(
      "/api/v1/teaching-groups",
      { method: "POST", body: dto },
    );
  },
  update(id: string, dto: UpdateTeachingGroupDto) {
    return apiRequest<TeachingGroupResponse, UpdateTeachingGroupDto>(
      `/api/v1/teaching-groups/${id}`,
      { method: "PATCH", body: dto },
    );
  },
};

export const studentSubjectsApi = {
  list(query: ListStudentSubjectsQueryDto = {}) {
    return apiRequest<StudentSubjectResponse[]>(
      `/api/v1/subject-enrollments${toQueryString(query)}`,
    );
  },
  listByEnrollment(enrollmentId: string) {
    return apiRequest<StudentSubjectResponse[]>(
      `/api/v1/enrollments/${enrollmentId}/subjects`,
    );
  },
  create(enrollmentId: string, dto: CreateStudentSubjectDto) {
    return apiRequest<StudentSubjectResponse, CreateStudentSubjectDto>(
      `/api/v1/enrollments/${enrollmentId}/subjects`,
      { method: "POST", body: dto },
    );
  },
  update(enrollmentId: string, id: string, dto: UpdateStudentSubjectDto) {
    return apiRequest<StudentSubjectResponse, UpdateStudentSubjectDto>(
      `/api/v1/enrollments/${enrollmentId}/subjects/${id}`,
      { method: "PATCH", body: dto },
    );
  },
};

export const enrollmentCombinationsApi = {
  get(enrollmentId: string) {
    return apiRequest<EnrollmentCombinationResponse>(
      `/api/v1/enrollments/${enrollmentId}/combination`,
    );
  },
  set(enrollmentId: string, dto: SetEnrollmentCombinationDto) {
    return apiRequest<EnrollmentCombinationResponse, SetEnrollmentCombinationDto>(
      `/api/v1/enrollments/${enrollmentId}/combination`,
      { method: "POST", body: dto },
    );
  },
};

export const teachingAssignmentsApi = {
  list(params: QueryParams = {}) {
    return apiRequest<TeachingAssignmentResponse[]>(
      `/api/v1/teaching-assignments${toQueryString(params)}`,
    );
  },
  get(id: string) {
    return apiRequest<TeachingAssignmentResponse>(
      `/api/v1/teaching-assignments/${id}`,
    );
  },
  create(dto: CreateTeachingAssignmentDto) {
    return apiRequest<TeachingAssignmentResponse, CreateTeachingAssignmentDto>(
      "/api/v1/teaching-assignments",
      { method: "POST", body: dto },
    );
  },
  update(id: string, dto: UpdateTeachingAssignmentDto) {
    return apiRequest<
      TeachingAssignmentResponse,
      UpdateTeachingAssignmentDto
    >(`/api/v1/teaching-assignments/${id}`, { method: "PATCH", body: dto });
  },
};


