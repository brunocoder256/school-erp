import {
  apiRequest,
  toQueryString,
  type QueryParams,
} from "@/features/academic/api/client";
import type {
  ClassResponse,
  CreateClassDto,
  CreateLevelDto,
  CreateOrganizationDto,
  CreateProgressionDto,
  CreateSectionDto,
  CreateStreamDto,
  LevelResponse,
  OrganizationResponse,
  ProgressionResponse,
  SectionResponse,
  StreamResponse,
  UpdateClassDto,
  UpdateLevelDto,
  UpdateOrganizationDto,
  UpdateProgressionDto,
  UpdateSectionDto,
  UpdateStreamDto,
} from "@/types/academic";

export const sectionsApi = {
  list() {
    return apiRequest<SectionResponse[]>("/api/v1/sections");
  },
  get(id: string) {
    return apiRequest<SectionResponse>(`/api/v1/sections/${id}`);
  },
  create(dto: CreateSectionDto) {
    return apiRequest<SectionResponse, CreateSectionDto>("/api/v1/sections", {
      method: "POST",
      body: dto,
    });
  },
  update(id: string, dto: UpdateSectionDto) {
    return apiRequest<SectionResponse, UpdateSectionDto>(
      `/api/v1/sections/${id}`,
      { method: "PATCH", body: dto },
    );
  },
  delete(id: string) {
    return apiRequest<void>(`/api/v1/sections/${id}`, { method: "DELETE" });
  },
};

export const organizationsApi = {
  list() {
    return apiRequest<OrganizationResponse[]>("/api/v1/academic-organizations");
  },
  get(id: string) {
    return apiRequest<OrganizationResponse>(
      `/api/v1/academic-organizations/${id}`,
    );
  },
  create(dto: CreateOrganizationDto) {
    return apiRequest<OrganizationResponse, CreateOrganizationDto>(
      "/api/v1/academic-organizations",
      { method: "POST", body: dto },
    );
  },
  update(id: string, dto: UpdateOrganizationDto) {
    return apiRequest<OrganizationResponse, UpdateOrganizationDto>(
      `/api/v1/academic-organizations/${id}`,
      { method: "PATCH", body: dto },
    );
  },
  delete(id: string) {
    return apiRequest<void>(`/api/v1/academic-organizations/${id}`, {
      method: "DELETE",
    });
  },
};

export const levelsApi = {
  list(sectionId: string) {
    return apiRequest<LevelResponse[]>(
      `/api/v1/sections/${sectionId}/levels`,
    );
  },
  get(sectionId: string, id: string) {
    return apiRequest<LevelResponse>(
      `/api/v1/sections/${sectionId}/levels/${id}`,
    );
  },
  create(sectionId: string, dto: CreateLevelDto) {
    return apiRequest<LevelResponse, CreateLevelDto>(
      `/api/v1/sections/${sectionId}/levels`,
      { method: "POST", body: dto },
    );
  },
  update(sectionId: string, id: string, dto: UpdateLevelDto) {
    return apiRequest<LevelResponse, UpdateLevelDto>(
      `/api/v1/sections/${sectionId}/levels/${id}`,
      { method: "PATCH", body: dto },
    );
  },
  delete(sectionId: string, id: string) {
    return apiRequest<void>(
      `/api/v1/sections/${sectionId}/levels/${id}`,
      { method: "DELETE" },
    );
  },
};

export const classesApi = {
  list(levelId: string) {
    return apiRequest<ClassResponse[]>(
      `/api/v1/levels/${levelId}/classes`,
    );
  },
  get(levelId: string, id: string) {
    return apiRequest<ClassResponse>(
      `/api/v1/levels/${levelId}/classes/${id}`,
    );
  },
  create(levelId: string, dto: CreateClassDto) {
    return apiRequest<ClassResponse, CreateClassDto>(
      `/api/v1/levels/${levelId}/classes`,
      { method: "POST", body: dto },
    );
  },
  update(levelId: string, id: string, dto: UpdateClassDto) {
    return apiRequest<ClassResponse, UpdateClassDto>(
      `/api/v1/levels/${levelId}/classes/${id}`,
      { method: "PATCH", body: dto },
    );
  },
  delete(levelId: string, id: string) {
    return apiRequest<void>(
      `/api/v1/levels/${levelId}/classes/${id}`,
      { method: "DELETE" },
    );
  },
};

export const streamsApi = {
  list(classId: string) {
    return apiRequest<StreamResponse[]>(
      `/api/v1/classes/${classId}/streams`,
    );
  },
  get(classId: string, id: string) {
    return apiRequest<StreamResponse>(
      `/api/v1/classes/${classId}/streams/${id}`,
    );
  },
  create(classId: string, dto: CreateStreamDto) {
    return apiRequest<StreamResponse, CreateStreamDto>(
      `/api/v1/classes/${classId}/streams`,
      { method: "POST", body: dto },
    );
  },
  update(classId: string, id: string, dto: UpdateStreamDto) {
    return apiRequest<StreamResponse, UpdateStreamDto>(
      `/api/v1/classes/${classId}/streams/${id}`,
      { method: "PATCH", body: dto },
    );
  },
  delete(classId: string, id: string) {
    return apiRequest<void>(
      `/api/v1/classes/${classId}/streams/${id}`,
      { method: "DELETE" },
    );
  },
};

export const progressionsApi = {
  list(params: QueryParams = {}) {
    return apiRequest<ProgressionResponse[]>(
      `/api/v1/progressions${toQueryString(params)}`,
    );
  },
  get(id: string) {
    return apiRequest<ProgressionResponse>(`/api/v1/progressions/${id}`);
  },
  create(dto: CreateProgressionDto) {
    return apiRequest<ProgressionResponse, CreateProgressionDto>(
      "/api/v1/progressions",
      { method: "POST", body: dto },
    );
  },
  update(id: string, dto: UpdateProgressionDto) {
    return apiRequest<ProgressionResponse, UpdateProgressionDto>(
      `/api/v1/progressions/${id}`,
      { method: "PATCH", body: dto },
    );
  },
  delete(id: string) {
    return apiRequest<void>(`/api/v1/progressions/${id}`, {
      method: "DELETE",
    });
  },
};
