import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declares permission keys required for a route.
 * Enforced by PermissionGuard against the active school context.
 *
 * Multiple keys use AND semantics: the authenticated user must hold every listed permission.
 *
 * @example
 * @Permissions('students.read')
 * @Permissions('grades.enter', 'grades.update')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
