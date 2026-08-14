"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createChildAction,
  type ChildFormState,
  updateChildAction,
} from "@/modules/children/actions/child-actions";

type ChildFormProps = {
  child?: {
    id: string;
    communityId: string;
    fullName: string;
    dateOfBirth: Date;
    sex: string;
  };
  communities: { id: string; name: string; healthCenter: { name: string } }[];
};

const initialState: ChildFormState = {};

export function ChildForm({ child, communities }: ChildFormProps) {
  const action = child
    ? updateChildAction.bind(null, child.id)
    : createChildAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
    >
      <label className="block text-sm font-medium" htmlFor="communityId">
        Comunidad
        <select
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
          defaultValue={child?.communityId ?? ""}
          id="communityId"
          name="communityId"
          required
        >
          <option value="">Selecciona una comunidad</option>
          {communities.map((community) => (
            <option key={community.id} value={community.id}>
              {community.name} — {community.healthCenter.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium" htmlFor="fullName">
        Nombre completo
        <input
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
          defaultValue={child?.fullName ?? ""}
          id="fullName"
          name="fullName"
          placeholder="Nombre del niño"
          required
        />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium" htmlFor="dateOfBirth">
          Fecha de nacimiento
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={child?.dateOfBirth.toISOString().slice(0, 10) ?? ""}
            id="dateOfBirth"
            name="dateOfBirth"
            required
            type="date"
          />
        </label>
        <label className="text-sm font-medium" htmlFor="sex">
          Sexo registrado
          <select
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={child?.sex ?? ""}
            id="sex"
            name="sex"
            required
          >
            <option value="">Selecciona una opción</option>
            <option value="MALE">Masculino</option>
            <option value="FEMALE">Femenino</option>
          </select>
        </label>
      </div>
      {state.error ? (
        <p
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? "Guardando…" : child ? "Guardar cambios" : "Registrar niño"}
      </Button>
    </form>
  );
}
