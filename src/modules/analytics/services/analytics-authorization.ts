import { ApplicationError } from "@/lib/errors/application-error";
import type { ApplicationUser } from "@/modules/auth/types";

export function resolveAnalyticsCenterId(
  user: ApplicationUser,
  requestedCenterId: string,
) {
  if (user.role === "ADMIN") return requestedCenterId || undefined;
  if (requestedCenterId && requestedCenterId !== user.healthCenterId) {
    throw new ApplicationError("FORBIDDEN");
  }
  return user.healthCenterId ?? "";
}
