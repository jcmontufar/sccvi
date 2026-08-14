import { ApplicationError } from "@/lib/errors/application-error";
import type { ApplicationRole, ApplicationUser } from "@/modules/auth/types";

export type AuthorizedAction =
  | "health-center:list"
  | "health-center:read"
  | "health-center:update"
  | "health-center:change-status"
  | "community:list"
  | "community:read"
  | "community:create"
  | "community:update"
  | "community:deactivate"
  | "guardian:list"
  | "guardian:read"
  | "guardian:create"
  | "guardian:update"
  | "guardian:deactivate"
  | "child:list"
  | "child:read"
  | "child:create"
  | "child:update"
  | "child:deactivate"
  | "child:manage-guardians"
  | "growth:list"
  | "growth:create"
  | "growth:update";

export type AuthorizationResource = {
  healthCenterId?: string | null;
  guardianUserIds?: readonly string[];
};

const allowedRoles: Record<AuthorizedAction, readonly ApplicationRole[]> = {
  "health-center:list": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER"],
  "health-center:read": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER"],
  "health-center:update": ["ADMIN", "CENTER_MANAGER"],
  "health-center:change-status": ["ADMIN"],
  "community:list": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER"],
  "community:read": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER"],
  "community:create": ["ADMIN", "CENTER_MANAGER"],
  "community:update": ["ADMIN", "CENTER_MANAGER"],
  "community:deactivate": ["ADMIN", "CENTER_MANAGER"],
  "guardian:list": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER"],
  "guardian:read": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER", "GUARDIAN"],
  "guardian:create": ["ADMIN", "HEALTH_STAFF"],
  "guardian:update": ["ADMIN", "HEALTH_STAFF"],
  "guardian:deactivate": ["ADMIN", "HEALTH_STAFF"],
  "child:list": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER", "GUARDIAN"],
  "child:read": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER", "GUARDIAN"],
  "child:create": ["ADMIN", "HEALTH_STAFF"],
  "child:update": ["ADMIN", "HEALTH_STAFF"],
  "child:deactivate": ["ADMIN", "HEALTH_STAFF"],
  "child:manage-guardians": ["ADMIN", "HEALTH_STAFF"],
  "growth:list": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER", "GUARDIAN"],
  "growth:create": ["ADMIN", "HEALTH_STAFF"],
  "growth:update": ["ADMIN", "HEALTH_STAFF"],
};

export function can(
  user: ApplicationUser,
  action: AuthorizedAction,
  resource: AuthorizationResource = {},
) {
  if (!user.isActive || !allowedRoles[action].includes(user.role)) return false;
  if (user.role === "ADMIN") return true;

  if (user.role === "GUARDIAN") {
    return resource.guardianUserIds?.includes(user.id) ?? false;
  }
  if (!user.healthCenterId) return false;

  return (
    resource.healthCenterId === undefined ||
    resource.healthCenterId === user.healthCenterId
  );
}

export function authorize(
  user: ApplicationUser,
  action: AuthorizedAction,
  resource: AuthorizationResource = {},
) {
  if (!can(user, action, resource)) {
    throw new ApplicationError("FORBIDDEN");
  }
}
