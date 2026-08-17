/**
 * Stable public school shape — no memberships, roles, or internal relations.
 */
export type SchoolResponse = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};
