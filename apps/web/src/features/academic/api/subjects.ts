import {
  apiRequest,
  toQueryString,
  type QueryParams,
} from "@/features/academic/api/client";
import type {
  CreateSubjectCategoryDto,
  CreateSubjectCombinationDto,
  CreateSubjectDto,
  CreateSubjectOfferingDto,
  SubjectCategoryResponse,
  SubjectCombinationResponse,
  SubjectOfferingResponse,
  SubjectResponse,
  UpdateSubjectCategoryDto,
  UpdateSubjectCombinationDto,
  UpdateSubjectDto,
  UpdateSubjectOfferingDto,
} from "@/types/academic";

export const subjectCategoriesApi = {
  list(params: QueryParams = {}) {
    return apiRequest<SubjectCategoryResponse[]>(
      `/api/v1/subject-categories${toQueryString(params)}`,
    );
  },
  get(id: string) {
    return apiRequest<SubjectCategoryResponse>(
      `/api/v1/subject-categories/${id}`,
    );
  },
  create(dto: CreateSubjectCategoryDto) {
    return apiRequest<SubjectCategoryResponse, CreateSubjectCategoryDto>(
      "/api/v1/subject-categories",
      { method: "POST", body: dto },
    );
  },
  update(id: string, dto: UpdateSubjectCategoryDto) {
    return apiRequest<SubjectCategoryResponse, UpdateSubjectCategoryDto>(
      `/api/v1/subject-categories/${id}`,
      { method: "PATCH", body: dto },
    );
  },
  delete(id: string) {
    return apiRequest<void>(`/api/v1/subject-categories/${id}`, {
      method: "DELETE",
    });
  },
};

export const subjectsApi = {
  list(params: QueryParams = {}) {
    return apiRequest<SubjectResponse[]>(
      `/api/v1/subjects${toQueryString(params)}`,
    );
  },
  get(id: string) {
    return apiRequest<SubjectResponse>(`/api/v1/subjects/${id}`);
  },
  create(dto: CreateSubjectDto) {
    return apiRequest<SubjectResponse, CreateSubjectDto>("/api/v1/subjects", {
      method: "POST",
      body: dto,
    });
  },
  update(id: string, dto: UpdateSubjectDto) {
    return apiRequest<SubjectResponse, UpdateSubjectDto>(
      `/api/v1/subjects/${id}`,
      { method: "PATCH", body: dto },
    );
  },
  delete(id: string) {
    return apiRequest<void>(`/api/v1/subjects/${id}`, { method: "DELETE" });
  },
};

export const subjectOfferingsApi = {
  list(params: QueryParams = {}) {
    return apiRequest<SubjectOfferingResponse[]>(
      `/api/v1/subject-offerings${toQueryString(params)}`,
    );
  },
  get(id: string) {
    return apiRequest<SubjectOfferingResponse>(
      `/api/v1/subject-offerings/${id}`,
    );
  },
  create(dto: CreateSubjectOfferingDto) {
    return apiRequest<SubjectOfferingResponse, CreateSubjectOfferingDto>(
      "/api/v1/subject-offerings",
      { method: "POST", body: dto },
    );
  },
  update(id: string, dto: UpdateSubjectOfferingDto) {
    return apiRequest<SubjectOfferingResponse, UpdateSubjectOfferingDto>(
      `/api/v1/subject-offerings/${id}`,
      { method: "PATCH", body: dto },
    );
  },
  delete(id: string) {
    return apiRequest<void>(`/api/v1/subject-offerings/${id}`, {
      method: "DELETE",
    });
  },
};

export const subjectCombinationsApi = {
  list(params: QueryParams = {}) {
    return apiRequest<SubjectCombinationResponse[]>(
      `/api/v1/subject-combinations${toQueryString(params)}`,
    );
  },
  get(id: string) {
    return apiRequest<SubjectCombinationResponse>(
      `/api/v1/subject-combinations/${id}`,
    );
  },
  create(dto: CreateSubjectCombinationDto) {
    return apiRequest<SubjectCombinationResponse, CreateSubjectCombinationDto>(
      "/api/v1/subject-combinations",
      { method: "POST", body: dto },
    );
  },
  update(id: string, dto: UpdateSubjectCombinationDto) {
    return apiRequest<SubjectCombinationResponse, UpdateSubjectCombinationDto>(
      `/api/v1/subject-combinations/${id}`,
      { method: "PATCH", body: dto },
    );
  },
  delete(id: string) {
    return apiRequest<void>(`/api/v1/subject-combinations/${id}`, {
      method: "DELETE",
    });
  },
};
