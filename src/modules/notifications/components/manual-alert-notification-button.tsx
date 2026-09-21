"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { sendManualAlertNotificationAction } from "@/modules/notifications/actions/manual-alert-notification-actions";

export function ManualAlertNotificationButton({
  alertId,
  guardianId,
}: {
  alertId: string;
  guardianId: string;
}) {
  const [result, setResult] = useState<{
    error?: string;
    message?: string;
  }>({});
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () =>
            setResult(
              await sendManualAlertNotificationAction(alertId, guardianId),
            ),
          )
        }
        type="button"
      >
        {pending ? "Enviando…" : "Enviar notificación"}
      </Button>
      {result.message ? (
        <p className="mt-2 text-sm text-success" role="status">
          {result.message}
        </p>
      ) : null}
      {result.error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {result.error}
        </p>
      ) : null}
    </div>
  );
}
