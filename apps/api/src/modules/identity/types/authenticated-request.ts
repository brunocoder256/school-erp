/**
 * Request-scoped identity after authentication.
 *
 * Tenant-scoped authorization must always resolve through `activeSchoolId`:
 * User → activeSchoolId → SchoolMembership → UserRole → Role → RolePermission → Permission
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  /** Explicit active school for this request. Null only for system-wide actors. */
  activeSchoolId: string | null;
  roleNames: string[];
  permissionKeys: string[];
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
