"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createVaccineAction,
  type VaccineFormState,
  updateVaccineAction,
} from "@/modules/vaccination/actions/vaccine-actions";

export function VaccineForm({
  vaccine,
}: {
  vaccine?: { id: string; name: string; description: string | null };
}) {
  const action = vaccine
    ? updateVaccineAction.bind(null, vaccine.id)
    : createVaccineAction;
  const [state, formAction, pending] = useActionState<
    VaccineFormState,
    FormData
  >(action, {});
  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border bg-card p-5"
    >
      <label className="block text-sm font-medium">
        Nombre
        <input
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
          defaultValue={vaccine?.name ?? ""}
          name="name"
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Descripción
        <textarea
          className="mt-2 min-h-28 w-full rounded-lg border bg-background p-3 font-normal"
          defaultValue={vaccine?.description ?? ""}
          name="description"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? "Guardando…" : "Guardar vacuna"}
      </Button>
    </form>
  );
}
