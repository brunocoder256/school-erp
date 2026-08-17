export interface JwtPayload {
  sub: string;
  activeSchoolId: string | null;
}

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

export interface AuthLoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  requiresSchoolSelection: boolean;
  user: AuthUserSummary;
  schools: AuthSchoolSummary[];
}

export interface AuthMeResult {
  id: string;
  email: string;
  fullName: string;
  activeSchoolId: string | null;
  roleNames: string[];
  permissionKeys: string[];
}
