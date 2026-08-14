"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createGuardianAction,
  type GuardianFormState,
  updateGuardianAction,
} from "@/modules/guardians/actions/guardian-actions";

type GuardianFormProps = {
  guardian?: {
    id: string;
    communityId: string;
    fullName: string;
    identification: string | null;
    phone: string | null;
    email: string | null;
    preferredNotificationChannel: string | null;
  };
  communities: { id: string; name: string; healthCenter: { name: string } }[];
};

const initialState: GuardianFormState = {};

export function GuardianForm({ guardian, communities }: GuardianFormProps) {
  const action = guardian
    ? updateGuardianAction.bind(null, guardian.id)
    : createGuardianAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="communityId">
          Comunidad
        </label>
        <select
          className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          defaultValue={guardian?.communityId ?? ""}
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
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="fullName">
          Nombre completo
        </label>
        <input
          className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          defaultValue={guardian?.fullName ?? ""}
          id="fullName"
          name="fullName"
          placeholder="Nombre del tutor o responsable"
          required
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium" htmlFor="identification">
          Identificación
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={guardian?.identification ?? ""}
            id="identification"
            name="identification"
            placeholder="Opcional"
          />
        </label>
        <label className="text-sm font-medium" htmlFor="phone">
          Teléfono
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={guardian?.phone ?? ""}
            id="phone"
            name="phone"
            placeholder="Opcional"
            type="tel"
          />
        </label>
        <label className="text-sm font-medium" htmlFor="email">
          Correo electrónico
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={guardian?.email ?? ""}
            id="email"
            name="email"
            placeholder="Opcional"
            type="email"
          />
        </label>
        <label
          className="text-sm font-medium"
          htmlFor="preferredNotificationChannel"
        >
          Preferencia de notificación
          <select
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={guardian?.preferredNotificationChannel ?? ""}
            id="preferredNotificationChannel"
            name="preferredNotificationChannel"
          >
            <option value="">Sin preferencia</option>
            <option value="EMAIL">Correo electrónico</option>
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
        {pending
          ? "Guardando…"
          : guardian
            ? "Guardar cambios"
            : "Registrar tutor"}
      </Button>
    </form>
  );
}
