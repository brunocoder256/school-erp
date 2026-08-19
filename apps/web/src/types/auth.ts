export type AuthStatus = "loading" | "unauthenticated" | "authenticated";

export interface AuthSchoolSummary {
  id: string;
  name: string;
  code: string;
}

export interface AuthUserSummary {
  id: string;
  email: string;
  fullName: string;
  activeSchoolId: string | null;
}

export interface AuthSession {
  accessToken: string;
  tokenType: "Bearer";
  requiresSchoolSelection: boolean;
  user: AuthUserSummary;
  schools: AuthSchoolSummary[];
}

export interface CurrentUserProfile {
  id: string;
  email: string;
  fullName: string;
  activeSchoolId: string | null;
  roleNames: string[];
  permissionKeys: string[];
}

export interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  user: CurrentUserProfile | null;
  memberships: AuthSchoolSummary[];
  activeSchool: AuthSchoolSummary | null;
  requiresSchoolSelection: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string, fallbackPermissions?: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  selectSchool: (schoolId: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
