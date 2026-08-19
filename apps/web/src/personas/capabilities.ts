/**
 * Capability Resolution
 *
 * Maps backend permission keys to frontend capabilities.
 * Capabilities answer: "Can this user perform action X?"
 *
 * Permissions are the source of truth from the backend.
 * Capabilities are the UI convenience layer.
 */

export interface Capabilities {
  // School Management
  canManageSchool: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageMemberships: boolean;

  // Academic Structure
  canManageAcademicStructure: boolean;
  canManageAcademicYears: boolean;
  canManageTerms: boolean;

  // Students
  canViewStudents: boolean;
  canManageStudents: boolean;
  canManageStudentProgressions: boolean;

  // Staff
  canViewStaff: boolean;
  canManageStaff: boolean;

  // Teaching & Academics
  canManageSubjects: boolean;
  canManageTeachingAssignments: boolean;
  canManageSubjectAllocations: boolean;
  canManageTeachingGroups: boolean;
  canManageStudentSubjects: boolean;

  // Attendance
  canViewAttendance: boolean;
  canMarkAttendance: boolean;

  // Grades & Assessment
  canViewGrades: boolean;
  canEnterGrades: boolean;
  canUpdateGrades: boolean;
  canApproveGrades: boolean;

  // Report Cards & Transcripts
  canViewReportCards: boolean;
  canManageReportCards: boolean;
  canApproveReportCards: boolean;
  canViewTranscripts: boolean;

  // Subject Combinations
  canManageSubjectCombinations: boolean;
}

/**
 * Resolves capabilities from a set of backend permission keys.
 *
 * Backend permissions are the source of truth.
 * This function maps them to capability flags used by the UI.
 */
export function resolveCapabilities(
  permissionKeys: Set<string>,
): Capabilities {
  return {
    // School Management
    canManageSchool: permissionKeys.has("schools.update"),
    canManageUsers: permissionKeys.has("users.create"),
    canManageRoles: permissionKeys.has("roles.assign"),
    canManageMemberships:
      permissionKeys.has("memberships.create") &&
      permissionKeys.has("memberships.update"),

    // Academic Structure
    canManageAcademicStructure: permissionKeys.has(
      "academic_structure.create",
    ),
    canManageAcademicYears: permissionKeys.has("academic_years.create"),
    canManageTerms: permissionKeys.has("terms.create"),

    // Students
    canViewStudents: permissionKeys.has("students.read"),
    canManageStudents: permissionKeys.has("students.create"),
    canManageStudentProgressions: permissionKeys.has(
      "student_progressions.create",
    ),

    // Staff
    canViewStaff: permissionKeys.has("staff.read"),
    canManageStaff: permissionKeys.has("staff.create"),

    // Teaching & Academics
    canManageSubjects: permissionKeys.has("subjects.create"),
    canManageTeachingAssignments: permissionKeys.has(
      "teacher_assignments.create",
    ),
    canManageSubjectAllocations: permissionKeys.has(
      "subject_allocations.create",
    ),
    canManageTeachingGroups: permissionKeys.has("teaching_groups.create"),
    canManageStudentSubjects: permissionKeys.has("student_subjects.create"),

    // Attendance
    canViewAttendance: permissionKeys.has("attendance.read"),
    canMarkAttendance: permissionKeys.has("attendance.mark"),

    // Grades & Assessment
    canViewGrades: permissionKeys.has("grades.read"),
    canEnterGrades: permissionKeys.has("grades.enter"),
    canUpdateGrades: permissionKeys.has("grades.update"),
    canApproveGrades: permissionKeys.has("grades.approve"),

    // Report Cards & Transcripts
    canViewReportCards: permissionKeys.has("report_cards.read"),
    canManageReportCards: permissionKeys.has("report_cards.create"),
    canApproveReportCards: permissionKeys.has("report_cards.approve"),
    canViewTranscripts: permissionKeys.has("transcripts.read"),

    // Subject Combinations
    canManageSubjectCombinations: permissionKeys.has("combinations.create"),
  };
}

/**
 * Checks if capabilities include all required capabilities.
 */
export function hasAllCapabilities(
  capabilities: Capabilities,
  required: (keyof Capabilities)[],
): boolean {
  return required.every((cap) => capabilities[cap]);
}

/**
 * Checks if capabilities include any required capability.
 */
export function hasAnyCapability(
  capabilities: Capabilities,
  required: (keyof Capabilities)[],
): boolean {
  return required.some((cap) => capabilities[cap]);
}
