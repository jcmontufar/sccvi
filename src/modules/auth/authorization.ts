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
  | "community:deactivate";

export type AuthorizationResource = { healthCenterId?: string | null };

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
};

export function can(
  user: ApplicationUser,
  action: AuthorizedAction,
  resource: AuthorizationResource = {},
) {
  if (!user.isActive || !allowedRoles[action].includes(user.role)) return false;
  if (user.role === "ADMIN") return true;
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
