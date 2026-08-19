import { describe, expect, it } from "vitest";

import { hasPermission } from "@/lib/permissions";

describe("hasPermission", () => {
  it("returns true when the user has the exact permission", () => {
    expect(hasPermission("students.read", ["students.read", "dashboard.view"])).toBe(true);
  });

  it("returns true when a wildcard access permission is present", () => {
    expect(hasPermission("settings.manage", ["*"])).toBe(true);
  });

  it("returns false when the permission is missing", () => {
    expect(hasPermission("settings.manage", ["students.read"])).toBe(false);
  });
});
