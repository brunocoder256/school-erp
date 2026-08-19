"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { fetchCurrentUser, loginRequest, selectSchoolRequest } from "@/lib/api/auth";
import { isUnauthorizedError } from "@/lib/api/client";
import type {
  AuthContextValue,
  AuthSession,
  AuthStatus,
  CurrentUserProfile,
} from "@/types/auth";

const AUTH_STORAGE_KEY = "school-erp-auth-session";

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed?.accessToken && parsed?.user && Array.isArray(parsed?.schools)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function writeStoredSession(session: AuthSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUserProfile(
  session: AuthSession | null,
  user: CurrentUserProfile | null,
): CurrentUserProfile | null {
  if (!session && !user) {
    return null;
  }

  const baseUser = user ?? {
    id: session?.user.id ?? "",
    email: session?.user.email ?? "",
    fullName: session?.user.fullName ?? "",
    activeSchoolId: session?.user.activeSchoolId ?? null,
    roleNames: [],
    permissionKeys: [],
  };

  return {
    ...baseUser,
    activeSchoolId:
      session?.user.activeSchoolId ??
      baseUser.activeSchoolId ??
      user?.activeSchoolId ??
      null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [user, setUser] = useState<CurrentUserProfile | null>(null);

  const clearSessionState = useCallback(() => {
    setSession(null);
    setUser(null);
    writeStoredSession(null);
  }, []);

  const refresh = useCallback(async () => {
    const storedSession = readStoredSession();
    if (!storedSession?.accessToken) {
      clearSessionState();
      setStatus("unauthenticated");
      return;
    }

    try {
      const currentUser = await fetchCurrentUser();
      const nextSession: AuthSession = {
        ...storedSession,
        user: {
          ...storedSession.user,
          activeSchoolId: currentUser.activeSchoolId,
        },
      };

      setSession(nextSession);
      setUser(currentUser);
      writeStoredSession(nextSession);
      setStatus("authenticated");
    } catch (error) {
      clearSessionState();
      setStatus("unauthenticated");
      if (isUnauthorizedError(error)) {
        router.push("/login");
      }
    }
  }, [clearSessionState, router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  const logout = useCallback(async () => {
    clearSessionState();
    setStatus("unauthenticated");
    router.push("/login");
  }, [clearSessionState, router]);

  const login = useCallback(async (email: string, password: string) => {
    const nextSession = await loginRequest(email, password);
    const profile = await fetchCurrentUser();
    const hydratedSession: AuthSession = {
      ...nextSession,
      user: {
        ...nextSession.user,
        activeSchoolId: profile.activeSchoolId,
      },
    };

    setSession(hydratedSession);
    setUser(profile);
    writeStoredSession(hydratedSession);
    setStatus("authenticated");
  }, []);

  const selectSchool = useCallback(async (schoolId: string) => {
    const nextSession = await selectSchoolRequest(schoolId);
    const profile = await fetchCurrentUser();
    const hydratedSession: AuthSession = {
      ...nextSession,
      user: {
        ...nextSession.user,
        activeSchoolId: profile.activeSchoolId,
      },
    };

    setSession(hydratedSession);
    setUser(profile);
    writeStoredSession(hydratedSession);
    setStatus("authenticated");
  }, []);

  const memberships = useMemo(() => session?.schools ?? [], [session]);
  const activeSchool = useMemo(
    () =>
      memberships.find(
        (school) =>
          school.id === (user?.activeSchoolId ?? session?.user.activeSchoolId),
      ) ?? null,
    [memberships, session?.user.activeSchoolId, user?.activeSchoolId],
  );
  const requiresSchoolSelection = session?.requiresSchoolSelection ?? false;

  const hasPermission = useCallback(
    (permission: string, fallbackPermissions: string[] = []) => {
      const permissions = user?.permissionKeys ?? fallbackPermissions;
      return permissions.includes(permission) || permissions.includes("*");
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]) => permissions.some((permission) => hasPermission(permission)),
    [hasPermission],
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]) => permissions.every((permission) => hasPermission(permission)),
    [hasPermission],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: toUserProfile(session, user),
      memberships,
      activeSchool,
      requiresSchoolSelection,
      isAuthenticated: status === "authenticated",
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      login,
      selectSchool,
      refresh,
      logout,
    }),
    [
      activeSchool,
      hasAllPermissions,
      hasAnyPermission,
      hasPermission,
      login,
      logout,
      memberships,
      refresh,
      requiresSchoolSelection,
      selectSchool,
      session,
      status,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
