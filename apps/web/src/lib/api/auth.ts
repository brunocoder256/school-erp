import { apiRequest } from "@/lib/api/client";
import type {
  AuthSession,
  AuthUserSummary,
  CurrentUserProfile,
} from "@/types/auth";

export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthSession> {
  return apiRequest<AuthSession, { email: string; password: string }>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: { email, password },
    },
  );
}

export async function selectSchoolRequest(
  schoolId: string,
): Promise<AuthSession> {
  return apiRequest<AuthSession, { schoolId: string }>(
    "/api/v1/auth/select-school",
    {
      method: "POST",
      body: { schoolId },
    },
  );
}

export async function fetchCurrentUser(): Promise<CurrentUserProfile> {
  return apiRequest<CurrentUserProfile>("/api/v1/auth/me");
}

export async function fetchCurrentUserSummary(): Promise<AuthUserSummary> {
  return apiRequest<AuthUserSummary>("/api/v1/auth/me");
}
