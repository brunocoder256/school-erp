import { describe, expect, it } from "vitest";

import { hasAllPermissions, hasAnyPermission, hasPermission } from "@/lib/permissions";

describe("permission helpers", () => {
  it("returns true when the user has the exact permission", () => {
    expect(hasPermission("students.read", ["students.read", "dashboard.view"])).toBe(true);
  });

  it("returns true when a wildcard access permission is present", () => {
    expect(hasPermission("settings.manage", ["*"])).toBe(true);
  });

  it("returns false when the permission is missing", () => {
    expect(hasPermission("settings.manage", ["students.read"])).toBe(false);
  });

  it("supports any-of permission checks", () => {
    expect(hasAnyPermission(["students.read", "settings.manage"], ["settings.manage"])).toBe(true);
  });

  it("supports all-of permission checks", () => {
    expect(hasAllPermissions(["dashboard.view", "students.read"], ["dashboard.view", "students.read"])).toBe(true);
    expect(hasAllPermissions(["dashboard.view", "students.read"], ["dashboard.view"])).toBe(false);
  });
});
