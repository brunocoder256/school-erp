import {
  MembershipStatus,
  RoleScope,
  UserStatus,
} from '../../../../generated/prisma/enums';

/**
 * Safe public user shape — never includes passwordHash.
 */
export type UserResponse = {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * School membership shape scoped to a single school.
 */
export type MembershipResponse = {
  userId: string;
  schoolId: string;
  status: MembershipStatus;
  joinedAt: Date;
};

/**
 * A user as a member of the active school.
 */
export type SchoolMemberResponse = {
  userId: string;
  email: string;
  fullName: string;
  userStatus: UserStatus;
  membershipStatus: MembershipStatus;
  joinedAt: Date;
  roleNames: string[];
};

/**
 * A role that is assignable through normal school administration
 * (Role.scope = SCHOOL only). SYSTEM roles are never exposed here.
 */
export type AssignableRoleResponse = {
  id: string;
  name: string;
  description: string | null;
  scope: RoleScope;
};

/**
 * A UserRole assignment scoped to the active school.
 */
export type UserRoleAssignmentResponse = {
  id: string;
  userId: string;
  roleId: string;
  schoolId: string;
};
