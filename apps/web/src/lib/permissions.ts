export type PermissionName =
  | "dashboard.view"
  | "students.read"
  | "students.manage"
  | "academics.read"
  | "reports.read"
  | "settings.manage";

export function hasPermission(
  permission: PermissionName | string,
  userPermissions: Array<PermissionName | string> = [],
): boolean {
  return userPermissions.includes(permission) || userPermissions.includes("*");
}
