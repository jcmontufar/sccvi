"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  correctGrowthRecordAction,
  createGrowthRecordAction,
  type GrowthFormState,
} from "@/modules/growth/actions/growth-record-actions";
import { suggestNextGrowthFollowUpDate } from "@/modules/growth/services/follow-up-suggestion";
import { calculateExactAge } from "@/modules/growth/utils/exact-age";

type GrowthRecordFormProps = {
  childId: string;
  dateOfBirth?: string;
  record?: {
    id: string;
    measurementDate: Date;
    weightKg: { toString(): string };
    heightCm: { toString(): string };
    measurementMethod: "RECUMBENT_LENGTH" | "STANDING_HEIGHT" | null;
    notes: string | null;
  };
};

function safeExactAge(dateOfBirth: string, measurementDate: string) {
  try {
    return calculateExactAge(dateOfBirth, measurementDate);
  } catch {
    return null;
  }
}

export function GrowthRecordForm({
  childId,
  dateOfBirth,
  record,
}: GrowthRecordFormProps) {
  const action = record
    ? correctGrowthRecordAction.bind(null, childId, record.id)
    : createGrowthRecordAction.bind(null, childId);
  const [state, formAction, pending] = useActionState(
    action,
    {} as GrowthFormState,
  );
  const [measurementDate, setMeasurementDate] = useState(
    record?.measurementDate.toISOString().slice(0, 10) ?? "",
  );
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const exactAge =
    !record && dateOfBirth && measurementDate
      ? safeExactAge(dateOfBirth, measurementDate)
      : null;
  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium" htmlFor="measurementDate">
          Fecha de medición
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={
              record?.measurementDate.toISOString().slice(0, 10) ?? ""
            }
            id="measurementDate"
            name="measurementDate"
            min={dateOfBirth}
            onChange={(event) => {
              const value = event.target.value;
              setMeasurementDate(value);
              setNextFollowUpDate(
                !record && dateOfBirth && value && value >= dateOfBirth
                  ? (suggestNextGrowthFollowUpDate(dateOfBirth, value) ?? "")
                  : "",
              );
            }}
            required
            type="date"
          />
          {exactAge ? (
            <span className="mt-1 block font-normal text-muted-foreground">
              Edad al control: {exactAge.years * 12 + exactAge.months} meses
            </span>
          ) : null}
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
        <label className="text-sm font-medium" htmlFor="measurementMethod">
          Método de talla
          <select
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={record?.measurementMethod ?? ""}
            id="measurementMethod"
            name="measurementMethod"
            required
          >
            <option disabled value="">
              Selecciona un método
            </option>
            <option value="RECUMBENT_LENGTH">Longitud recostada</option>
            <option value="STANDING_HEIGHT">Talla de pie</option>
          </select>
        </label>
      </div>
      {!record ? (
        <label className="block text-sm font-medium" htmlFor="nextFollowUpDate">
          Próxima fecha de seguimiento (opcional)
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal sm:max-w-xs"
            id="nextFollowUpDate"
            name="nextFollowUpDate"
            onChange={(event) => setNextFollowUpDate(event.target.value)}
            type="date"
            value={nextFollowUpDate}
          />
          <span className="mt-1 block font-normal text-muted-foreground">
            SCCVI sugiere una fecha según la edad; el personal puede cambiarla o
            dejarla vacía.
          </span>
        </label>
      ) : null}
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
