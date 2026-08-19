import { describe, expect, it } from "vitest";
import {
  resolveCapabilities,
  hasAllCapabilities,
  hasAnyCapability,
  type Capabilities,
} from "./capabilities";
import {
  resolvePrimaryPersona,
  resolveAllPersonas,
  resolvePersonaProfile,
  getPersonaLabel,
} from "./persona-resolver";
import {
  getPersonaWorkspace,
  getVisibleSections,
} from "./workspace-definitions";
import {
  getAvailableQuickActions,
  canAccessQuickAction,
} from "./quick-actions";

describe("Personas Module", () => {
  describe("Capabilities", () => {
    it("should resolve capabilities from permission keys", () => {
      const permissions = new Set([
        "users.create",
        "schools.update",
        "roles.assign",
      ]);

      const capabilities = resolveCapabilities(permissions);

      expect(capabilities.canManageUsers).toBe(true);
      expect(capabilities.canManageSchool).toBe(true);
      expect(capabilities.canManageRoles).toBe(true);
      expect(capabilities.canEnterGrades).toBe(false);
    });

    it("should handle empty permission set", () => {
      const permissions = new Set<string>();
      const capabilities = resolveCapabilities(permissions);

      expect(capabilities.canManageUsers).toBe(false);
      expect(capabilities.canEnterGrades).toBe(false);
      expect(capabilities.canMarkAttendance).toBe(false);
    });

    it("should resolve teacher permissions", () => {
      const permissions = new Set([
        "attendance.mark",
        "grades.enter",
        "grades.update",
        "students.read",
      ]);

      const capabilities = resolveCapabilities(permissions);

      expect(capabilities.canMarkAttendance).toBe(true);
      expect(capabilities.canEnterGrades).toBe(true);
      expect(capabilities.canUpdateGrades).toBe(true);
      expect(capabilities.canViewStudents).toBe(true);
      expect(capabilities.canManageUsers).toBe(false);
    });

    it("should check all capabilities", () => {
      const permissions = new Set(["grades.read", "attendance.read"]);
      const capabilities = resolveCapabilities(permissions);

      expect(
        hasAllCapabilities(capabilities, [
          "canViewGrades",
          "canViewAttendance",
        ]),
      ).toBe(true);

      expect(
        hasAllCapabilities(capabilities, [
          "canViewGrades",
          "canEnterGrades",
        ]),
      ).toBe(false);
    });

    it("should check any capability", () => {
      const permissions = new Set(["grades.read"]);
      const capabilities = resolveCapabilities(permissions);

      expect(
        hasAnyCapability(capabilities, [
          "canEnterGrades",
          "canViewGrades",
        ]),
      ).toBe(true);

      expect(
        hasAnyCapability(capabilities, [
          "canManageUsers",
          "canManageRoles",
        ]),
      ).toBe(false);
    });
  });

  describe("Persona Resolver", () => {
    it("should resolve ADMINISTRATOR persona", () => {
      const permissions = new Set(["schools.update", "users.create"]);
      const capabilities = resolveCapabilities(permissions);

      const persona = resolvePrimaryPersona(capabilities);

      expect(persona).toBe("ADMINISTRATOR");
    });

    it("should resolve TEACHER persona", () => {
      const permissions = new Set([
        "attendance.mark",
        "grades.enter",
        "students.read",
      ]);
      const capabilities = resolveCapabilities(permissions);

      const persona = resolvePrimaryPersona(capabilities);

      expect(persona).toBe("TEACHER");
    });

    it("should resolve STAFF persona (no grade entry)", () => {
      const permissions = new Set([
        "attendance.mark",
        "students.read",
      ]);
      const capabilities = resolveCapabilities(permissions);

      const persona = resolvePrimaryPersona(capabilities);

      expect(persona).toBe("STAFF");
    });

    it("should resolve STUDENT persona", () => {
      const permissions = new Set(["grades.read", "students.read"]);
      const capabilities = resolveCapabilities(permissions);

      const persona = resolvePrimaryPersona(capabilities);

      expect(persona).toBe("STUDENT");
    });

    it("should resolve UNKNOWN persona when no relevant permissions", () => {
      const permissions = new Set<string>();
      const capabilities = resolveCapabilities(permissions);

      const persona = resolvePrimaryPersona(capabilities);

      expect(persona).toBe("UNKNOWN");
    });

    it("should resolve all personas for multiple responsibilities", () => {
      // Teacher + Administrator
      const permissions = new Set([
        "schools.update",
        "users.create",
        "attendance.mark",
        "grades.enter",
        "students.read",
      ]);
      const capabilities = resolveCapabilities(permissions);

      const personas = resolveAllPersonas(capabilities);

      expect(personas).toContain("ADMINISTRATOR");
      expect(personas).toContain("TEACHER");
      expect(personas.length).toBe(2);
    });

    it("should return persona profile with all data", () => {
      const permissions = new Set(["attendance.mark", "grades.enter"]);
      const capabilities = resolveCapabilities(permissions);

      const profile = resolvePersonaProfile(capabilities);

      expect(profile.primary).toBe("TEACHER");
      expect(profile.all).toContain("TEACHER");
      expect(profile.capabilities).toEqual(capabilities);
    });

    it("should get human-readable persona labels", () => {
      expect(getPersonaLabel("ADMINISTRATOR")).toBe("School Administrator");
      expect(getPersonaLabel("TEACHER")).toBe("Teacher");
      expect(getPersonaLabel("STUDENT")).toBe("Student");
      expect(getPersonaLabel("PARENT")).toBe("Parent/Guardian");
      expect(getPersonaLabel("STAFF")).toBe("School Staff");
      expect(getPersonaLabel("UNKNOWN")).toBe("Unknown Role");
    });
  });

  describe("Workspace Definitions", () => {
    it("should filter workspace sections by capabilities", () => {
      const permissions = new Set(["schools.update", "users.create"]);
      const capabilities = resolveCapabilities(permissions);

      const workspace = getPersonaWorkspace("ADMINISTRATOR", capabilities);

      expect(workspace.sections.length).toBeGreaterThan(0);
      expect(workspace.sections.some((s) => s.id === "overview")).toBe(true);
    });

    it("should hide workspace sections without required capabilities", () => {
      // User has only school.update, not users.create
      const permissions = new Set(["schools.update"]);
      const capabilities = resolveCapabilities(permissions);

      const workspace = getPersonaWorkspace("ADMINISTRATOR", capabilities);

      // users-staff section requires canManageUsers
      const usersStaffSection = workspace.sections.find(
        (s) => s.id === "users-staff",
      );
      expect(usersStaffSection).toBeUndefined();
    });

    it("should get teacher workspace sections", () => {
      const permissions = new Set([
        "attendance.mark",
        "grades.enter",
        "students.read",
      ]);
      const capabilities = resolveCapabilities(permissions);

      const workspace = getPersonaWorkspace("TEACHER", capabilities);

      expect(workspace.title).toContain("Teaching");
      expect(workspace.sections.some((s) => s.id === "assessment")).toBe(true);
    });

    it("should get student workspace sections", () => {
      const permissions = new Set(["grades.read", "students.read"]);
      const capabilities = resolveCapabilities(permissions);

      const workspace = getPersonaWorkspace("STUDENT", capabilities);

      expect(workspace.title).toContain("Academics");
      expect(workspace.sections.some((s) => s.id === "grades")).toBe(true);
    });

    it("should get visible sections across multiple personas", () => {
      const permissions = new Set([
        "schools.update",
        "users.create",
        "attendance.mark",
        "grades.enter",
      ]);
      const capabilities = resolveCapabilities(permissions);

      const sections = getVisibleSections(
        ["ADMINISTRATOR", "TEACHER"],
        capabilities,
      );

      expect(sections.length).toBeGreaterThan(0);
      expect(sections.some((s) => s.id === "overview")).toBe(true);
    });

    it("should not duplicate sections from multiple personas", () => {
      const permissions = new Set([
        "schools.update",
        "attendance.mark",
        "grades.enter",
      ]);
      const capabilities = resolveCapabilities(permissions);

      const sections = getVisibleSections(
        ["ADMINISTRATOR", "TEACHER"],
        capabilities,
      );

      const sectionIds = sections.map((s) => s.id);
      const uniqueIds = new Set(sectionIds);

      expect(sectionIds.length).toBe(uniqueIds.size);
    });
  });

  describe("Quick Actions", () => {
    it("should get available quick actions for administrator", () => {
      const permissions = new Set(["schools.update", "users.create"]);
      const capabilities = resolveCapabilities(permissions);

      const actions = getAvailableQuickActions(
        ["add-student", "add-staff", "enter-grades"],
        capabilities,
      );

      const actionIds = actions.map((a) => a.id);
      expect(actionIds).toContain("add-student");
      expect(actionIds).toContain("add-staff");
      expect(actionIds).not.toContain("enter-grades");
    });

    it("should get available quick actions for teacher", () => {
      const permissions = new Set([
        "attendance.mark",
        "grades.enter",
        "students.read",
      ]);
      const capabilities = resolveCapabilities(permissions);

      const actions = getAvailableQuickActions(
        ["mark-attendance", "enter-grades", "add-student"],
        capabilities,
      );

      const actionIds = actions.map((a) => a.id);
      expect(actionIds).toContain("mark-attendance");
      expect(actionIds).toContain("enter-grades");
      expect(actionIds).not.toContain("add-student");
    });

    it("should check if user can access quick action", () => {
      const permissions = new Set(["grades.enter"]);
      const capabilities = resolveCapabilities(permissions);

      expect(canAccessQuickAction("enter-grades", capabilities)).toBe(true);
      expect(canAccessQuickAction("add-student", capabilities)).toBe(false);
    });

    it("should return empty array for actions with missing permissions", () => {
      const permissions = new Set<string>();
      const capabilities = resolveCapabilities(permissions);

      const actions = getAvailableQuickActions(
        ["mark-attendance", "enter-grades"],
        capabilities,
      );

      expect(actions).toEqual([]);
    });

    it("should handle non-existent action IDs gracefully", () => {
      const permissions = new Set(["grades.enter"]);
      const capabilities = resolveCapabilities(permissions);

      const actions = getAvailableQuickActions(
        ["enter-grades", "non-existent-action"],
        capabilities,
      );

      expect(actions.length).toBe(1);
      expect(actions[0].id).toBe("enter-grades");
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle teacher + administrator with multiple responsibilities", () => {
      const permissions = new Set([
        // Admin permissions
        "schools.update",
        "users.create",
        "roles.assign",
        // Teacher permissions
        "attendance.mark",
        "grades.enter",
        "students.read",
      ]);

      const capabilities = resolveCapabilities(permissions);
      const profile = resolvePersonaProfile(capabilities);

      // Primary should be admin (has priority)
      expect(profile.primary).toBe("ADMINISTRATOR");

      // Should include both personas
      expect(profile.all).toContain("ADMINISTRATOR");
      expect(profile.all).toContain("TEACHER");

      // Should have both sets of actions available
      const adminActions = getAvailableQuickActions(
        ["add-student"],
        capabilities,
      );
      const teacherActions = getAvailableQuickActions(
        ["mark-attendance"],
        capabilities,
      );

      expect(adminActions.length).toBe(1);
      expect(teacherActions.length).toBe(1);
    });

    it("should handle school switch scenario", () => {
      // School A: Teacher
      const schoolAPermissions = new Set([
        "attendance.mark",
        "grades.enter",
      ]);
      const schoolACapabilities = resolveCapabilities(schoolAPermissions);
      const schoolAPersona = resolvePrimaryPersona(schoolACapabilities);

      expect(schoolAPersona).toBe("TEACHER");

      // School B: Administrator
      const schoolBPermissions = new Set(["schools.update", "users.create"]);
      const schoolBCapabilities = resolveCapabilities(schoolBPermissions);
      const schoolBPersona = resolvePrimaryPersona(schoolBCapabilities);

      expect(schoolBPersona).toBe("ADMINISTRATOR");

      // Different schools = different personas
      expect(schoolAPersona).not.toBe(schoolBPersona);
    });
  });
});
