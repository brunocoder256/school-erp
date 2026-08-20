import { appConfig } from "@/config/app";
import type { ApiErrorResponse, ApiResponse } from "@/types/api";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiRequestOptions<TBody = undefined> = Omit<RequestInit, "body"> & {
  method?: HttpMethod;
  body?: TBody;
  timeoutMs?: number;
};

export class ApiError extends Error {
  status?: number;
  validationErrors?: Record<string, string[]> | null;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function readSessionToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem("school-erp-auth-session");
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { accessToken?: string };
    return parsed.accessToken ?? null;
  } catch {
    return null;
  }
}

function normalizeErrorMessage(status: number, payload: ApiErrorResponse | null): string {
  const backendMessage = payload?.message ?? "";

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to access this area.";
  }

  if (status >= 500) {
    return "Unable to connect to the server. Please try again.";
  }

  if (backendMessage && backendMessage.toLowerCase().includes("credentials")) {
    return "Invalid credentials.";
  }

  if (backendMessage && backendMessage.toLowerCase().includes("school")) {
    return backendMessage;
  }

  return backendMessage || "Something went wrong. Please try again.";
}

export async function apiRequest<T, TBody = undefined>(
  path: string,
  options: ApiRequestOptions<TBody> = {} as ApiRequestOptions<TBody>,
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const bodyValue = options.body as unknown;
    const isBodyJson =
      bodyValue !== undefined &&
      typeof bodyValue !== "string" &&
      !(bodyValue instanceof FormData) &&
      !(bodyValue instanceof URLSearchParams) &&
      !(bodyValue instanceof Blob) &&
      !(bodyValue instanceof ArrayBuffer);

    const accessToken = readSessionToken();
    const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(isBodyJson ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body:
        isBodyJson && bodyValue !== undefined
          ? JSON.stringify(bodyValue)
          : (bodyValue as BodyInit | null | undefined),
    });

    const isJsonResponse = response.headers
      .get("content-type")
      ?.includes("application/json");

    const payload = isJsonResponse ? await response.json() : null;

     if (!response.ok) {
      const errorPayload = payload as ApiErrorResponse | null;
      const apiError = new ApiError(
        normalizeErrorMessage(response.status, errorPayload),
        response.status,
      );
      apiError.validationErrors = errorPayload?.errors ?? null;
      throw apiError;
    }

    return (payload as ApiResponse<T> | T) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Request timed out.", 408);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ApiError(error.message, 500);
    }

    throw new ApiError("Unknown API request error.", 500);
  } finally {
    clearTimeout(timeoutId);
  }
}
