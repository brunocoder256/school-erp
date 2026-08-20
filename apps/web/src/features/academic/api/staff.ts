import {
  apiRequest,
  toQueryString,
} from "@/features/academic/api/client";
import type {
  ListStaffQueryDto,
  StaffDetailResponse,
  StaffSummaryResponse,
} from "@/types/academic";

export const staffApi = {
  list(params: ListStaffQueryDto = {}) {
    return apiRequest<StaffSummaryResponse[]>(
      `/api/v1/staff${toQueryString(params)}`,
    );
  },
  get(id: string) {
    return apiRequest<StaffDetailResponse>(`/api/v1/staff/${id}`);
  },
};

export async function listStaff(
  params: ListStaffQueryDto = {},
): Promise<StaffSummaryResponse[]> {
  return staffApi.list(params);
}

export async function getStaffDetail(
  id: string,
): Promise<StaffDetailResponse> {
  return staffApi.get(id);
}
