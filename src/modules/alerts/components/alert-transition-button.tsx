"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  resolveAlertAction,
  reviewAlertAction,
} from "@/modules/alerts/actions/alert-actions";

export function AlertTransitionButton({
  id,
  action,
}: {
  id: string;
  action: "review" | "resolve";
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () =>
            setError(
              (
                await (action === "review"
                  ? reviewAlertAction(id)
                  : resolveAlertAction(id))
              ).error,
            ),
          )
        }
        type="button"
      >
        {pending
          ? "Procesando…"
          : action === "review"
            ? "Marcar revisada"
            : "Resolver alerta"}
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
