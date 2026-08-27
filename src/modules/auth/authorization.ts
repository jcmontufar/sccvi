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
  | "growth:update"
  | "vaccine:list"
  | "vaccine:read"
  | "vaccine:create"
  | "vaccine:update"
  | "vaccine:deactivate"
  | "vaccination:list"
  | "vaccination:create"
  | "alert:list"
  | "alert:read"
  | "alert:review"
  | "alert:resolve"
  | "notification:create"
  | "campaign:list"
  | "campaign:read"
  | "campaign:create"
  | "campaign:send"
  | "qr:manage"
  | "dashboard:read"
  | "report:read";

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
  "vaccine:list": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER"],
  "vaccine:read": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER"],
  "vaccine:create": ["ADMIN"],
  "vaccine:update": ["ADMIN"],
  "vaccine:deactivate": ["ADMIN"],
  "vaccination:list": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER", "GUARDIAN"],
  "vaccination:create": ["ADMIN", "HEALTH_STAFF"],
  "alert:list": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER", "GUARDIAN"],
  "alert:read": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER", "GUARDIAN"],
  "alert:review": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER"],
  "alert:resolve": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER"],
  "notification:create": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER"],
  "campaign:list": ["ADMIN", "CENTER_MANAGER"],
  "campaign:read": ["ADMIN", "CENTER_MANAGER"],
  "campaign:create": ["ADMIN", "CENTER_MANAGER"],
  "campaign:send": ["ADMIN", "CENTER_MANAGER"],
  "qr:manage": ["ADMIN", "HEALTH_STAFF"],
  "dashboard:read": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER", "GUARDIAN"],
  "report:read": ["ADMIN", "HEALTH_STAFF", "CENTER_MANAGER"],
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
