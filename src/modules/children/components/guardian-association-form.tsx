"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  associateGuardianAction,
  type ChildFormState,
} from "@/modules/children/actions/child-actions";

export function GuardianAssociationForm({
  childId,
  guardians,
}: {
  childId: string;
  guardians: { id: string; fullName: string }[];
}) {
  const [state, action, pending] = useActionState(
    associateGuardianAction.bind(null, childId),
    {} as ChildFormState,
  );
  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2"
    >
      <label className="text-sm font-medium" htmlFor="guardianId">
        Tutor o responsable
        <select
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
          id="guardianId"
          name="guardianId"
          required
        >
          <option value="">Selecciona un tutor</option>
          {guardians.map((guardian) => (
            <option key={guardian.id} value={guardian.id}>
              {guardian.fullName}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium" htmlFor="relationshipType">
        Tipo de relación
        <input
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
          id="relationshipType"
          name="relationshipType"
          placeholder="Ejemplo: madre, padre, responsable"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="isPrimary" type="checkbox" />
        Marcar como tutor principal
      </label>
      <div className="sm:text-right">
        <Button disabled={pending} type="submit">
          {pending ? "Asociando…" : "Asociar tutor"}
        </Button>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive sm:col-span-2" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
