export const applicationRoles = [
  "ADMIN",
  "HEALTH_STAFF",
  "CENTER_MANAGER",
  "GUARDIAN",
] as const;

export type ApplicationRole = (typeof applicationRoles)[number];

export type ApplicationUser = {
  id: string;
  authUserId: string;
  healthCenterId: string | null;
  fullName: string;
  email: string;
  role: ApplicationRole;
  isActive: boolean;
};
