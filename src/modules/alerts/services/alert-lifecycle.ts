import { ApplicationError } from "@/lib/errors/application-error";

export type AlertLifecycleStatus = "OPEN" | "REVIEWED" | "RESOLVED";

export function assertAlertTransition(
  current: AlertLifecycleStatus,
  target: AlertLifecycleStatus,
) {
  const allowed =
    (current === "OPEN" && target === "REVIEWED") ||
    (current === "REVIEWED" && target === "RESOLVED");
  if (!allowed) throw new ApplicationError("INVALID_ALERT_TRANSITION");
}
