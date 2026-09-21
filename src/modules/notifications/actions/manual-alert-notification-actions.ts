"use server";

import { revalidatePath } from "next/cache";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import { sendManualAlertNotification } from "@/modules/notifications/services/manual-alert-notification-service";

export async function sendManualAlertNotificationAction(
  alertId: string,
  guardianId: string,
) {
  try {
    const notification = await sendManualAlertNotification(
      await requireApplicationUser(),
      alertId,
      guardianId,
    );
    revalidatePath(`/app/alertas/${alertId}`);
    return notification.status === "SENT"
      ? { message: "Notificación enviada." }
      : { error: "No fue posible entregar la notificación." };
  } catch (error) {
    return { error: getSafeErrorMessage(error) };
  }
}
