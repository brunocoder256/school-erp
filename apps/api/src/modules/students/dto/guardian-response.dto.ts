import type { GuardianRelationshipType } from '../../../../generated/prisma/enums';

/**
 * Stable public guardian shape — the relationship flags and relationship type
 * are joined from the student-guardian link. Tenant is always the active school.
 */
export type GuardianResponse = {
  id: string;
  fullName: string;
  phone: string | null;
  alternatePhone: string | null;
  email: string | null;
  address: string | null;
  occupation: string | null;
  preferredContactMethod: string | null;
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  isAuthorizedPickup: boolean;
  createdAt: Date;
  updatedAt: Date;
};
