/**
 * Persona Resolution
 *
 * Derives user's persona(s) from capabilities.
 * A persona is a UI classification of the user's primary experience.
 *
 * A user may have multiple personas (e.g., Teacher + Administrator).
 */

import { type Capabilities } from "./capabilities";

export type Persona =
  | "ADMINISTRATOR"
  | "TEACHER"
  | "STUDENT"
  | "PARENT"
  | "STAFF"
  | "UNKNOWN";

export interface PersonaProfile {
  primary: Persona;
  all: Persona[];
  capabilities: Capabilities;
}

/**
 * Determines the primary persona based on capabilities.
 *
 * Priority order:
 * 1. ADMINISTRATOR (can manage school/users/roles)
 * 2. TEACHER (can mark attendance + enter grades)
 * 3. STAFF (can mark attendance but not enter grades)
 * 4. STUDENT (can view grades but not enter)
 * 5. PARENT (same as student — verified via parent permission later)
 * 6. UNKNOWN (no meaningful capabilities)
 */
export function resolvePrimaryPersona(
  capabilities: Capabilities,
): Persona {
  if (capabilities.canManageSchool) {
    return "ADMINISTRATOR";
  }

  if (
    capabilities.canMarkAttendance &&
    capabilities.canEnterGrades
  ) {
    return "TEACHER";
  }

  if (capabilities.canMarkAttendance) {
    return "STAFF";
  }

  if (capabilities.canViewGrades && !capabilities.canEnterGrades) {
    return "STUDENT";
  }

  // PARENT and STUDENT have similar permissions; backend role check
  // would differentiate if needed. For now, classify as STUDENT.

  return "UNKNOWN";
}

/**
 * Determines all applicable personas for a user.
 *
 * A user with multiple capability sets gets multiple personas.
 * Example: Teacher + Administrator.
 */
export function resolveAllPersonas(
  capabilities: Capabilities,
): Persona[] {
  const personas: Persona[] = [];

  if (capabilities.canManageSchool) {
    personas.push("ADMINISTRATOR");
  }

  if (
    capabilities.canMarkAttendance &&
    capabilities.canEnterGrades
  ) {
    personas.push("TEACHER");
  }

  if (
    capabilities.canMarkAttendance &&
    !personas.includes("TEACHER")
  ) {
    personas.push("STAFF");
  }

  if (capabilities.canViewGrades && !capabilities.canEnterGrades) {
    personas.push("STUDENT");
  }

  if (personas.length === 0) {
    personas.push("UNKNOWN");
  }

  return personas;
}

/**
 * Creates a complete persona profile from capabilities.
 */
export function resolvePersonaProfile(
  capabilities: Capabilities,
): PersonaProfile {
  return {
    primary: resolvePrimaryPersona(capabilities),
    all: resolveAllPersonas(capabilities),
    capabilities,
  };
}

/**
 * Gets a human-readable label for a persona.
 */
export function getPersonaLabel(persona: Persona): string {
  const labels: Record<Persona, string> = {
    ADMINISTRATOR: "School Administrator",
    TEACHER: "Teacher",
    STUDENT: "Student",
    PARENT: "Parent/Guardian",
    STAFF: "School Staff",
    UNKNOWN: "Unknown Role",
  };
  return labels[persona];
}
