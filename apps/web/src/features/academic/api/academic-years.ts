import {
  apiRequest,
  toQueryString,
  type QueryParams,
} from "@/features/academic/api/client";
import type {
  AcademicYearResponse,
  CreateAcademicYearDto,
  CreateTermDto,
  TermResponse,
  UpdateAcademicYearDto,
  UpdateTermDto,
} from "@/types/academic";

export async function listAcademicYears(): Promise<AcademicYearResponse[]> {
  return apiRequest<AcademicYearResponse[]>("/api/v1/academic-years");
}

export async function getAcademicYear(id: string): Promise<AcademicYearResponse> {
  return apiRequest<AcademicYearResponse>(`/api/v1/academic-years/${id}`);
}

export async function createAcademicYear(
  dto: CreateAcademicYearDto,
): Promise<AcademicYearResponse> {
  return apiRequest<AcademicYearResponse, CreateAcademicYearDto>(
    "/api/v1/academic-years",
    { method: "POST", body: dto },
  );
}

export async function updateAcademicYear(
  id: string,
  dto: UpdateAcademicYearDto,
): Promise<AcademicYearResponse> {
  return apiRequest<AcademicYearResponse, UpdateAcademicYearDto>(
    `/api/v1/academic-years/${id}`,
    { method: "PATCH", body: dto },
  );
}

export async function deleteAcademicYear(id: string): Promise<void> {
  await apiRequest<void>(`/api/v1/academic-years/${id}`, {
    method: "DELETE",
  });
}

export async function listTerms(
  academicYearId: string,
  params: QueryParams = {},
): Promise<TermResponse[]> {
  return apiRequest<TermResponse[]>(
    `/api/v1/academic-years/${academicYearId}/terms${toQueryString(params)}`,
  );
}

export async function getTerm(
  academicYearId: string,
  termId: string,
): Promise<TermResponse> {
  return apiRequest<TermResponse>(
    `/api/v1/academic-years/${academicYearId}/terms/${termId}`,
  );
}

export async function createTerm(
  academicYearId: string,
  dto: CreateTermDto,
): Promise<TermResponse> {
  return apiRequest<TermResponse, CreateTermDto>(
    `/api/v1/academic-years/${academicYearId}/terms`,
    { method: "POST", body: dto },
  );
}

export async function updateTerm(
  academicYearId: string,
  termId: string,
  dto: UpdateTermDto,
): Promise<TermResponse> {
  return apiRequest<TermResponse, UpdateTermDto>(
    `/api/v1/academic-years/${academicYearId}/terms/${termId}`,
    { method: "PATCH", body: dto },
  );
}

export async function deleteTerm(
  academicYearId: string,
  termId: string,
): Promise<void> {
  await apiRequest<void>(
    `/api/v1/academic-years/${academicYearId}/terms/${termId}`,
    { method: "DELETE" },
  );
}
