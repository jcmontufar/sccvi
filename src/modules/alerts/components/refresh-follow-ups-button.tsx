"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  refreshMissedFollowUpsAction,
  type RefreshFollowUpsState,
} from "@/modules/alerts/actions/alert-actions";

export function RefreshFollowUpsButton() {
  const [state, formAction, pending] = useActionState(
    refreshMissedFollowUpsAction,
    {} as RefreshFollowUpsState,
  );
  return (
    <form action={formAction}>
      <Button disabled={pending} type="submit" variant="outline">
        {pending ? "Actualizando…" : "Actualizar seguimientos vencidos"}
      </Button>
      {state.error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
