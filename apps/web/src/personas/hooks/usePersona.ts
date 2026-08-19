/**
 * usePersona Hook
 *
 * Integrates persona resolution with authentication context.
 * Provides capabilities, persona information, and workspace to components.
 */

"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  resolveCapabilities,
  hasAllCapabilities,
  hasAnyCapability,
  type Capabilities,
} from "../capabilities";
import {
  resolvePersonaProfile,
  resolvePrimaryPersona,
  resolveAllPersonas,
  type Persona,
  type PersonaProfile,
} from "../persona-resolver";
import { getPersonaWorkspace, getVisibleSections } from "../workspace-definitions";
import {
  getAvailableQuickActions,
  canAccessQuickAction,
  type QuickAction,
} from "../quick-actions";

export interface UsePersonaResult {
  /** Current user's capabilities derived from permissions */
  capabilities: Capabilities;

  /** User's primary persona (e.g., TEACHER, ADMINISTRATOR) */
  primaryPersona: Persona;

  /** All personas the user has (handles multiple responsibilities) */
  allPersonas: Persona[];

  /** Full persona profile with metadata */
  profile: PersonaProfile;

  /** Whether user has all specified capabilities */
  hasAllCapabilities: (caps: (keyof Capabilities)[]) => boolean;

  /** Whether user has any of the specified capabilities */
  hasAnyCapability: (caps: (keyof Capabilities)[]) => boolean;

  /** Can user access a specific quick action? */
  canAccessQuickAction: (actionId: string) => boolean;

  /** Get quick actions available to this user */
  getQuickActions: (actionIds: string[]) => QuickAction[];

  /** Get workspace layout for a specific persona */
  getWorkspace: (persona: Persona) =>
    | ReturnType<typeof getPersonaWorkspace>
    | null;

  /** Get all visible sections across user's personas */
  getVisibleSections: () => ReturnType<typeof getVisibleSections>;

  /** Is loading (auth or permissions not yet resolved) */
  isLoading: boolean;

  /** Is user authenticated */
  isAuthenticated: boolean;
}

/**
 * usePersona Hook
 *
 * Must be used within AuthProvider context.
 *
 * Example:
 * ```
 * const { capabilities, primaryPersona, profile } = usePersona();
 *
 * if (capabilities.canManageUsers) {
 *   // Show admin features
 * }
 *
 * if (primaryPersona === 'TEACHER') {
 *   // Show teacher-specific workspace
 * }
 * ```
 */
export function usePersona(): UsePersonaResult {
  const { user, status } = useAuth();
  const isLoading = status === "loading";

  const capabilities = useMemo(() => {
    if (!user?.permissionKeys) {
      return resolveCapabilities(new Set());
    }
    return resolveCapabilities(new Set(user.permissionKeys));
  }, [user?.permissionKeys]);

  const profile = useMemo(() => {
    return resolvePersonaProfile(capabilities);
  }, [capabilities]);

  const primaryPersona = useMemo(() => {
    return resolvePrimaryPersona(capabilities);
  }, [capabilities]);

  const allPersonas = useMemo(() => {
    return resolveAllPersonas(capabilities);
  }, [capabilities]);

  const memoHasAllCapabilities = (caps: (keyof Capabilities)[]) => {
    return hasAllCapabilities(capabilities, caps);
  };

  const memoHasAnyCapability = (caps: (keyof Capabilities)[]) => {
    return hasAnyCapability(capabilities, caps);
  };

  const memoCanAccessQuickAction = (actionId: string) => {
    return canAccessQuickAction(actionId, capabilities);
  };

  const memoGetQuickActions = (actionIds: string[]) => {
    return getAvailableQuickActions(actionIds, capabilities);
  };

  const memoGetWorkspace = (persona: Persona) => {
    try {
      return getPersonaWorkspace(persona, capabilities);
    } catch {
      return null;
    }
  };

  const memoGetVisibleSections = () => {
    return getVisibleSections(allPersonas, capabilities);
  };

  return {
    capabilities,
    primaryPersona,
    allPersonas,
    profile,
    hasAllCapabilities: memoHasAllCapabilities,
    hasAnyCapability: memoHasAnyCapability,
    canAccessQuickAction: memoCanAccessQuickAction,
    getQuickActions: memoGetQuickActions,
    getWorkspace: memoGetWorkspace,
    getVisibleSections: memoGetVisibleSections,
    isLoading,
    isAuthenticated: !!user,
  };
}
