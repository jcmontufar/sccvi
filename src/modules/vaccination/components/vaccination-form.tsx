"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createVaccinationAction,
  type VaccinationFormState,
} from "@/modules/vaccination/actions/vaccination-actions";

export function VaccinationForm({
  childId,
  doses,
  currentDate,
}: {
  childId: string;
  doses: { id: string; vaccineName: string; doseName: string }[];
  currentDate: string;
}) {
  const [state, action, pending] = useActionState<
    VaccinationFormState,
    FormData
  >(createVaccinationAction.bind(null, childId), {});
  return (
    <form action={action} className="space-y-5 rounded-xl border bg-card p-5">
      <label className="block text-sm font-medium">
        Dosis
        <select
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
          name="vaccineScheduleId"
          required
        >
          <option value="">Selecciona una dosis</option>
          {doses.map((dose) => (
            <option key={dose.id} value={dose.id}>
              {dose.vaccineName} — {dose.doseName}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Fecha de aplicación
        <input
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
          max={currentDate}
          name="applicationDate"
          required
          type="date"
        />
      </label>
      <label className="block text-sm font-medium">
        Notas
        <textarea
          className="mt-2 min-h-24 w-full rounded-lg border bg-background p-3"
          name="notes"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button disabled={pending || !doses.length} type="submit">
        {pending ? "Registrando…" : "Registrar vacuna"}
      </Button>
    </form>
  );
}
