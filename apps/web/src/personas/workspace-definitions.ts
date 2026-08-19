/**
 * Workspace Definitions
 *
 * Defines persona-specific workspace layouts, navigation sections, and components.
 */

import type { Persona } from "./persona-resolver";
import type { Capabilities } from "./capabilities";

export interface WorkspaceSection {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  requiredCapabilities: (keyof Capabilities)[];
}

export interface WorkspaceDefinition {
  persona: Persona;
  title: string;
  description: string;
  sections: WorkspaceSection[];
  primaryActions: string[]; // quick action IDs
  requiredCapabilities: (keyof Capabilities)[];
}

/**
 * Workspace definitions keyed by persona.
 * Each persona gets a tailored experience based on their capabilities.
 */
export const workspaceDefinitions: Record<Persona, WorkspaceDefinition> = {
  ADMINISTRATOR: {
    persona: "ADMINISTRATOR",
    title: "School Administration",
    description: "Manage school operations, staff, students, and academics",
    sections: [
      {
        id: "overview",
        label: "Overview",
        description: "School dashboard and statistics",
        requiredCapabilities: ["canManageSchool"],
      },
      {
        id: "users-staff",
        label: "Users & Staff",
        description: "Manage school members and staff assignments",
        requiredCapabilities: ["canManageUsers"],
      },
      {
        id: "academic-structure",
        label: "Academic Structure",
        description: "Configure classes, levels, streams, and subjects",
        requiredCapabilities: ["canManageAcademicStructure"],
      },
      {
        id: "students",
        label: "Students",
        description: "Manage student enrollments and progressions",
        requiredCapabilities: ["canManageStudents"],
      },
      {
        id: "teaching-assignments",
        label: "Teaching Assignments",
        description: "Assign teachers to classes and subjects",
        requiredCapabilities: ["canManageTeachingAssignments"],
      },
      {
        id: "assessment",
        label: "Assessment & Grades",
        description: "Manage grades, report cards, and assessments",
        requiredCapabilities: ["canViewGrades"],
      },
      {
        id: "attendance",
        label: "Attendance",
        description: "View and manage attendance records",
        requiredCapabilities: ["canViewAttendance"],
      },
      {
        id: "reports",
        label: "Reports",
        description: "Generate and view school reports",
        requiredCapabilities: ["canViewReportCards"],
      },
    ],
    primaryActions: [
      "add-student",
      "add-staff",
      "create-academic-year",
      "configure-subjects",
    ],
    requiredCapabilities: ["canManageSchool"],
  },

  TEACHER: {
    persona: "TEACHER",
    title: "Teaching Dashboard",
    description: "Manage your classes, assignments, and student assessments",
    sections: [
      {
        id: "overview",
        label: "My Teaching",
        description: "Your classes and teaching assignments",
        requiredCapabilities: ["canEnterGrades"],
      },
      {
        id: "attendance",
        label: "Attendance",
        description: "Mark and view class attendance",
        requiredCapabilities: ["canMarkAttendance"],
      },
      {
        id: "assessment",
        label: "Assessment",
        description: "Enter grades and manage assessments",
        requiredCapabilities: ["canEnterGrades"],
      },
      {
        id: "students",
        label: "My Students",
        description: "View your enrolled students",
        requiredCapabilities: ["canViewStudents"],
      },
      {
        id: "reports",
        label: "Reports",
        description: "View student report cards and transcripts",
        requiredCapabilities: ["canViewReportCards"],
      },
    ],
    primaryActions: [
      "mark-attendance",
      "enter-grades",
      "view-students",
      "view-report-cards",
    ],
    requiredCapabilities: ["canMarkAttendance", "canEnterGrades"],
  },

  STUDENT: {
    persona: "STUDENT",
    title: "My Academics",
    description: "View your academic performance and progress",
    sections: [
      {
        id: "overview",
        label: "My Record",
        description: "Your academic information",
        requiredCapabilities: ["canViewGrades"],
      },
      {
        id: "grades",
        label: "My Grades",
        description: "View your grades and assessments",
        requiredCapabilities: ["canViewGrades"],
      },
      {
        id: "attendance",
        label: "My Attendance",
        description: "View your attendance record",
        requiredCapabilities: ["canViewAttendance"],
      },
      {
        id: "reports",
        label: "Report Cards",
        description: "View your report cards and transcripts",
        requiredCapabilities: ["canViewReportCards"],
      },
    ],
    primaryActions: ["view-my-grades", "view-attendance", "view-report-card"],
    requiredCapabilities: ["canViewGrades"],
  },

  PARENT: {
    persona: "PARENT",
    title: "My Children",
    description: "Monitor your child's academic progress",
    sections: [
      {
        id: "overview",
        label: "My Children",
        description: "Your enrolled children",
        requiredCapabilities: ["canViewStudents"],
      },
      {
        id: "grades",
        label: "Grades",
        description: "View children's grades and assessments",
        requiredCapabilities: ["canViewGrades"],
      },
      {
        id: "attendance",
        label: "Attendance",
        description: "View children's attendance",
        requiredCapabilities: ["canViewAttendance"],
      },
      {
        id: "reports",
        label: "Report Cards",
        description: "View children's report cards",
        requiredCapabilities: ["canViewReportCards"],
      },
    ],
    primaryActions: ["view-child-grades", "view-child-attendance"],
    requiredCapabilities: ["canViewStudents", "canViewGrades"],
  },

  STAFF: {
    persona: "STAFF",
    title: "Staff Dashboard",
    description: "Manage your responsibilities and view school information",
    sections: [
      {
        id: "overview",
        label: "Overview",
        description: "Your staff information",
        requiredCapabilities: ["canMarkAttendance"],
      },
      {
        id: "attendance",
        label: "Attendance",
        description: "Mark attendance if authorized",
        requiredCapabilities: ["canMarkAttendance"],
      },
      {
        id: "academic-info",
        label: "Academic Information",
        description: "View academic structure and subjects",
        requiredCapabilities: ["canViewStudents"],
      },
    ],
    primaryActions: ["mark-attendance"],
    requiredCapabilities: ["canMarkAttendance"],
  },

  UNKNOWN: {
    persona: "UNKNOWN",
    title: "Welcome",
    description: "Your account is set up, but no roles have been assigned yet",
    sections: [
      {
        id: "welcome",
        label: "Getting Started",
        description: "Contact your administrator to assign roles",
        requiredCapabilities: [],
      },
    ],
    primaryActions: [],
    requiredCapabilities: [],
  },
};

/**
 * Gets the workspace definition for a persona, filtered by actual capabilities.
 * Returns only sections the user is authorized to access.
 */
export function getPersonaWorkspace(
  persona: Persona,
  capabilities: Capabilities,
): WorkspaceDefinition {
  const definition = workspaceDefinitions[persona];

  // Filter sections based on user's actual capabilities
  const filteredSections = definition.sections.filter((section) =>
    section.requiredCapabilities.every((cap) => capabilities[cap]),
  );

  return {
    ...definition,
    sections: filteredSections,
  };
}

/**
 * Gets all visible workspace sections across all user personas.
 */
export function getVisibleSections(
  personas: Persona[],
  capabilities: Capabilities,
): WorkspaceSection[] {
  const allSections = new Map<string, WorkspaceSection>();

  for (const persona of personas) {
    const workspace = getPersonaWorkspace(persona, capabilities);
    for (const section of workspace.sections) {
      allSections.set(section.id, section);
    }
  }

  return Array.from(allSections.values());
}
