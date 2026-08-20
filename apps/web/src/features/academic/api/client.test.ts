import { describe, expect, it } from "vitest";

import { toQueryString } from "@/features/academic/api/client";

describe("toQueryString", () => {
  it("returns an empty string for empty params", () => {
    expect(toQueryString({})).toBe("");
    expect(toQueryString({ a: undefined, b: null })).toBe("");
  });

  it("builds a query string from string values", () => {
    expect(toQueryString({ academicYearId: "y-1", isActive: false })).toBe(
      "?academicYearId=y-1&isActive=false",
    );
  });

  it("stringifies booleans and numbers", () => {
    const qs = toQueryString({ isActive: true, page: 2 });
    expect(qs).toBe("?isActive=true&page=2");
  });

  it("preserves order of keys", () => {
    const qs = toQueryString({ a: "1", b: "2", c: "3" });
    expect(qs).toBe("?a=1&b=2&c=3");
  });
});
