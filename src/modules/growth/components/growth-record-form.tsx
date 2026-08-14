"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  correctGrowthRecordAction,
  createGrowthRecordAction,
  type GrowthFormState,
} from "@/modules/growth/actions/growth-record-actions";

type GrowthRecordFormProps = {
  childId: string;
  record?: {
    id: string;
    measurementDate: Date;
    weightKg: { toString(): string };
    heightCm: { toString(): string };
    notes: string | null;
  };
};

export function GrowthRecordForm({ childId, record }: GrowthRecordFormProps) {
  const action = record
    ? correctGrowthRecordAction.bind(null, childId, record.id)
    : createGrowthRecordAction.bind(null, childId);
  const [state, formAction, pending] = useActionState(
    action,
    {} as GrowthFormState,
  );
  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="text-sm font-medium" htmlFor="measurementDate">
          Fecha de medición
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={
              record?.measurementDate.toISOString().slice(0, 10) ?? ""
            }
            id="measurementDate"
            name="measurementDate"
            required
            type="date"
          />
        </label>
        <label className="text-sm font-medium" htmlFor="weightKg">
          Peso (kg)
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={record?.weightKg.toString() ?? ""}
            id="weightKg"
            min="0.001"
            name="weightKg"
            required
            step="0.001"
            type="number"
          />
        </label>
        <label className="text-sm font-medium" htmlFor="heightCm">
          Talla (cm)
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={record?.heightCm.toString() ?? ""}
            id="heightCm"
            min="0.01"
            name="heightCm"
            required
            step="0.01"
            type="number"
          />
        </label>
      </div>
      <label className="block text-sm font-medium" htmlFor="notes">
        Notas
        <textarea
          className="mt-2 min-h-24 w-full rounded-lg border bg-background p-3 font-normal"
          defaultValue={record?.notes ?? ""}
          id="notes"
          name="notes"
          placeholder="Observaciones opcionales"
        />
      </label>
      {record ? (
        <label className="block text-sm font-medium" htmlFor="correctionReason">
          Motivo de la corrección
          <textarea
            className="mt-2 min-h-20 w-full rounded-lg border bg-background p-3 font-normal"
            id="correctionReason"
            name="correctionReason"
            placeholder="Explica por qué se corrige esta medición"
            required
          />
        </label>
      ) : null}
      {state.error ? (
        <p
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending
          ? "Guardando…"
          : record
            ? "Guardar corrección"
            : "Registrar medición"}
      </Button>
    </form>
  );
}
