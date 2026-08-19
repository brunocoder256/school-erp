import { appConfig } from "@/config/app";
import type { ApiErrorResponse, ApiResponse } from "@/types/api";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiRequestOptions<TBody = undefined> = Omit<RequestInit, "body"> & {
  method?: HttpMethod;
  body?: TBody;
  timeoutMs?: number;
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
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

    const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
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
      throw new Error(
        errorPayload?.message ?? `Request failed with status ${response.status}`,
      );
    }

    return (payload as ApiResponse<T> | T) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Unknown API request error");
  } finally {
    clearTimeout(timeoutId);
  }
}
