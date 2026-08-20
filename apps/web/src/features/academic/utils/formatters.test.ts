import { describe, expect, it } from "vitest";

import {
  activeVariant,
  formatDate,
  statusVariant,
  joinName,
  initials,
} from "@/features/academic/utils/formatters";

describe("formatters", () => {
  it("formats an ISO date", () => {
    const result = formatDate("2026-06-15T00:00:00Z");
    expect(result).not.toBe("—");
    expect(result).toMatch(/2026/);
  });

  it("formats undefined date", () => {
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate(null)).toBe("—");
  });

  it("maps active flag to variant", () => {
    expect(activeVariant(true)).toBe("success");
    expect(activeVariant(false)).toBe("warning");
  });

  it("maps status strings to variants", () => {
    expect(statusVariant("ACTIVE")).toBe("success");
    expect(statusVariant("WITHDRAWN")).toBe("danger");
    expect(statusVariant("PENDING")).toBe("warning");
    expect(statusVariant("UNKNOWN_STATUS")).toBe("default");
  });

  it("joins a staff/student name preferring preferred name", () => {
    expect(
      joinName({
        firstName: "John",
        middleName: "M",
        lastName: "Doe",
        preferredName: "Johnny",
      }),
    ).toBe("Johnny Doe");
    expect(
      joinName({ firstName: "John", lastName: "Doe" }),
    ).toBe("John Doe");
  });

  it("builds initials", () => {
    expect(initials("John Doe")).toBe("JD");
    expect(initials("Jane")).toBe("J");
    expect(initials(null)).toBe("—");
  });
});
