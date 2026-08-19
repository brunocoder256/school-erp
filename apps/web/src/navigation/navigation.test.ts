import { describe, expect, it } from "vitest";
import {
  filterNavigationByPermissions,
  isActiveRoute,
  navigationConfig,
  normalizePath,
} from "./navigation";

describe("navigation", () => {
  describe("normalizePath", () => {
    it("should return / for empty path", () => {
      expect(normalizePath("")).toBe("/");
      expect(normalizePath(undefined)).toBe("/");
    });

    it("should remove trailing slashes", () => {
      expect(normalizePath("/app/")).toBe("/app");
      expect(normalizePath("/app///")).toBe("/app");
    });

    it("should normalize multiple consecutive slashes", () => {
      expect(normalizePath("/app//students")).toBe("/app/students");
    });

    it("should keep root /", () => {
      expect(normalizePath("/")).toBe("/");
    });
  });

  describe("isActiveRoute", () => {
    it("should match exact route when exact=true", () => {
      expect(isActiveRoute("/app", "/app", true)).toBe(true);
      expect(isActiveRoute("/app", "/app/students", true)).toBe(false);
    });

    it("should match route and child routes by default", () => {
      expect(isActiveRoute("/app", "/app", false)).toBe(true);
      expect(isActiveRoute("/app", "/app/students", false)).toBe(true);
      expect(isActiveRoute("/app", "/app/students/123", false)).toBe(true);
    });

    it("should avoid false positives with similar route prefixes", () => {
      expect(isActiveRoute("/app", "/app-year", false)).toBe(false);
      expect(isActiveRoute("/academic", "/academics", false)).toBe(false);
      expect(isActiveRoute("/app/students", "/app/studentship", false)).toBe(
        false,
      );
    });

    it("should normalize paths before comparison", () => {
      expect(isActiveRoute("/app/", "/app", false)).toBe(true);
      expect(isActiveRoute("/app", "/app/", false)).toBe(true);
    });

    it("should match root path for any pathname", () => {
      expect(isActiveRoute("/", "/", true)).toBe(true);
      expect(isActiveRoute("/", "/app", false)).toBe(true);
      expect(isActiveRoute("/", "/any/deep/path", false)).toBe(true);
    });
  });

  describe("filterNavigationByPermissions", () => {
    it("should return empty array if no permissions granted", () => {
      const filtered = filterNavigationByPermissions(navigationConfig, () =>
        false,
      );
      expect(filtered).toEqual([]);
    });

    it("should include items with matching permissions", () => {
      const filtered = filterNavigationByPermissions(
        navigationConfig,
        (permissions: string[]) =>
          permissions.includes("dashboard.view") ||
          permissions.includes("students.read"),
      );
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((g) => g.id === "overview")).toBe(true);
      expect(filtered.some((g) => g.id === "students")).toBe(true);
    });

    it("should exclude items without matching permissions", () => {
      const filtered = filterNavigationByPermissions(
        navigationConfig,
        (permissions: string[]) => permissions.includes("dashboard.view"),
      );
      expect(filtered.length).toBeGreaterThan(0);
      // Only overview should have dashboard.view
      expect(filtered.some((g) => g.id === "overview")).toBe(true);
      expect(filtered.some((g) => g.id === "students")).toBe(false);
    });

    it("should remove empty groups", () => {
      const filtered = filterNavigationByPermissions(
        navigationConfig,
        () => false, // deny all permissions
      );
      // All items require specific permissions, so denying all should result in empty groups
      expect(filtered).toEqual([]);
    });

    it("should preserve group structure and labels", () => {
      const filtered = filterNavigationByPermissions(navigationConfig, () =>
        true,
      );
      expect(filtered.some((g) => g.label === "Overview")).toBe(true);
      expect(filtered.some((g) => g.label === "Academic")).toBe(true);
      expect(filtered.some((g) => g.label === "Administration")).toBe(true);
    });
  });

  describe("navigationConfig", () => {
    it("should have valid structure", () => {
      expect(Array.isArray(navigationConfig)).toBe(true);
      expect(navigationConfig.length).toBeGreaterThan(0);

      navigationConfig.forEach((group) => {
        expect(group.id).toBeDefined();
        expect(group.label).toBeDefined();
        expect(Array.isArray(group.items)).toBe(true);

        group.items.forEach((item) => {
          expect(item.id).toBeDefined();
          expect(item.label).toBeDefined();
          expect(item.route).toBeDefined();
          expect(item.route).toMatch(/^\/app/);
        });
      });
    });

    it("should have all items with required permissions defined", () => {
      navigationConfig.forEach((group) => {
        group.items.forEach((item) => {
          expect(item.requiredPermission).toBeDefined();
          expect(Array.isArray(item.requiredPermission)).toBe(true);
        });
      });
    });
  });
});
