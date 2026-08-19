/**
 * Quick Actions
 *
 * Permission-aware quick actions for persona workspaces.
 * Quick actions are contextual shortcuts to common tasks.
 */

import type { Capabilities } from "./capabilities";

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  route: string;
  requiredCapabilities: (keyof Capabilities)[];
  /** Set to true if the feature exists but the route is not yet implemented */
  comingSoon?: boolean;
}

/**
 * All available quick actions.
 * Each action is gated by required capabilities.
 */
export const quickActionsLibrary: Record<string, QuickAction> = {
  // Administrator
  "add-student": {
    id: "add-student",
    label: "Add Student",
    description: "Enroll a new student",
    icon: "user-plus",
    route: "/app/students/new",
    requiredCapabilities: ["canManageStudents"],
  },

  "add-staff": {
    id: "add-staff",
    label: "Add Staff Member",
    description: "Add a staff member to the school",
    icon: "briefcase",
    route: "/app/staff/new",
    requiredCapabilities: ["canManageStaff"],
  },

  "create-academic-year": {
    id: "create-academic-year",
    label: "Create Academic Year",
    description: "Set up a new academic year",
    icon: "calendar",
    route: "/app/academic-years/new",
    requiredCapabilities: ["canManageAcademicYears"],
  },

  "configure-subjects": {
    id: "configure-subjects",
    label: "Configure Subjects",
    description: "Manage school subjects",
    icon: "book",
    route: "/app/subjects",
    requiredCapabilities: ["canManageSubjects"],
  },

  // Teacher
  "mark-attendance": {
    id: "mark-attendance",
    label: "Mark Attendance",
    description: "Record class attendance",
    icon: "clipboard-check",
    route: "/app/attendance",
    requiredCapabilities: ["canMarkAttendance"],
  },

  "enter-grades": {
    id: "enter-grades",
    label: "Enter Grades",
    description: "Record student grades",
    icon: "pencil",
    route: "/app/grades",
    requiredCapabilities: ["canEnterGrades"],
  },

  "view-students": {
    id: "view-students",
    label: "View My Students",
    description: "See enrolled students",
    icon: "users",
    route: "/app/students",
    requiredCapabilities: ["canViewStudents"],
  },

  "view-report-cards": {
    id: "view-report-cards",
    label: "View Report Cards",
    description: "Access student report cards",
    icon: "file-text",
    route: "/app/report-cards",
    requiredCapabilities: ["canViewReportCards"],
  },

  // Student
  "view-my-grades": {
    id: "view-my-grades",
    label: "My Grades",
    description: "View your academic grades",
    icon: "star",
    route: "/app/my-grades",
    requiredCapabilities: ["canViewGrades"],
  },

  "view-attendance": {
    id: "view-attendance",
    label: "My Attendance",
    description: "Check your attendance record",
    icon: "calendar-check",
    route: "/app/my-attendance",
    requiredCapabilities: ["canViewAttendance"],
  },

  "view-report-card": {
    id: "view-report-card",
    label: "My Report Card",
    description: "View your report card",
    icon: "file-text",
    route: "/app/my-report-card",
    requiredCapabilities: ["canViewReportCards"],
  },

  // Parent
  "view-child-grades": {
    id: "view-child-grades",
    label: "Child's Grades",
    description: "View your child's grades",
    icon: "star",
    route: "/app/children/grades",
    requiredCapabilities: ["canViewGrades"],
  },

  "view-child-attendance": {
    id: "view-child-attendance",
    label: "Child's Attendance",
    description: "Check your child's attendance",
    icon: "calendar-check",
    route: "/app/children/attendance",
    requiredCapabilities: ["canViewAttendance"],
  },
};

/**
 * Filters quick actions by capabilities.
 * Returns only actions the user is authorized to access.
 */
export function getAvailableQuickActions(
  actionIds: string[],
  capabilities: Capabilities,
): QuickAction[] {
  return actionIds
    .map((id) => quickActionsLibrary[id])
    .filter((action) => {
      if (!action) return false;
      // Include even if coming soon (allow user to see what's available)
      return action.requiredCapabilities.every((cap) => capabilities[cap]);
    });
}

/**
 * Checks if a quick action is available to the user.
 */
export function canAccessQuickAction(
  actionId: string,
  capabilities: Capabilities,
): boolean {
  const action = quickActionsLibrary[actionId];
  if (!action) return false;
  return action.requiredCapabilities.every((cap) => capabilities[cap]);
}
