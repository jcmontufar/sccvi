"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  refreshVaccinationAlertsAction,
  type RefreshFollowUpsState,
} from "@/modules/alerts/actions/alert-actions";

export function RefreshVaccinationAlertsButton() {
  const [state, formAction, pending] = useActionState(
    refreshVaccinationAlertsAction,
    {} as RefreshFollowUpsState,
  );
  return (
    <form action={formAction}>
      <Button disabled={pending} type="submit" variant="outline">
        {pending ? "Actualizando…" : "Actualizar vacunas atrasadas"}
      </Button>
      {state.error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
