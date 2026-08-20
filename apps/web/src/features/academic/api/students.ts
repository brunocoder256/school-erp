import { apiRequest } from "@/features/academic/api/client";
import type {
  CreateEnrollmentDto,
  CreateStudentDto,
  EnrollmentResponse,
  StudentResponse,
  UpdateEnrollmentDto,
  UpdateStudentDto,
} from "@/types/academic";

export const studentsApi = {
  list() {
    return apiRequest<StudentResponse[]>("/api/v1/students");
  },
  get(id: string) {
    return apiRequest<StudentResponse>(`/api/v1/students/${id}`);
  },
  create(dto: CreateStudentDto) {
    return apiRequest<StudentResponse, CreateStudentDto>("/api/v1/students", {
      method: "POST",
      body: dto,
    });
  },
  update(id: string, dto: UpdateStudentDto) {
    return apiRequest<StudentResponse, UpdateStudentDto>(
      `/api/v1/students/${id}`,
      { method: "PATCH", body: dto },
    );
  },
  enrollments(studentId: string) {
    return apiRequest<EnrollmentResponse[]>(
      `/api/v1/students/${studentId}/enrollments`,
    );
  },
};

export const enrollmentsApi = {
  get(id: string) {
    return apiRequest<EnrollmentResponse>(`/api/v1/enrollments/${id}`);
  },
  create(studentId: string, dto: CreateEnrollmentDto) {
    return apiRequest<EnrollmentResponse, CreateEnrollmentDto>(
      `/api/v1/students/${studentId}/enrollments`,
      { method: "POST", body: dto },
    );
  },
  update(id: string, dto: UpdateEnrollmentDto) {
    return apiRequest<EnrollmentResponse, UpdateEnrollmentDto>(
      `/api/v1/enrollments/${id}`,
      { method: "PATCH", body: dto },
    );
  },
};
