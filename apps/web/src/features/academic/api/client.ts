import { apiRequest } from "@/lib/api/client";

export type QueryValue = string | number | boolean | undefined | null;

export interface QueryParams {
  [key: string]: QueryValue;
}

/**
 * Builds a `?key=value&...` suffix from a params object, dropping undefined/null
 * values. Booleans are lower-cased to match backend expectations.
 */
export function toQueryString(params: object = {}): string {
  const search = new URLSearchParams();
  const entries = Object.entries(params) as Array<[string, QueryValue]>;
  for (const [key, value] of entries) {
    if (value === undefined || value === null) {
      continue;
    }
    search.append(key, String(value));
  }

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Re-export the typed request helper so feature API modules share one client.
 */
export { apiRequest };
