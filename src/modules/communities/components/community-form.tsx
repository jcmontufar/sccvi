"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createCommunityAction,
  type CommunityFormState,
  updateCommunityAction,
} from "@/modules/communities/actions/community-actions";

type CommunityFormProps = {
  community?: {
    id: string;
    healthCenterId: string;
    name: string;
    location: string | null;
    estimatedFamilies: number | null;
  };
  healthCenters: { id: string; name: string }[];
  fixedHealthCenterId?: string;
};

const initialState: CommunityFormState = {};

export function CommunityForm({
  community,
  healthCenters,
  fixedHealthCenterId,
}: CommunityFormProps) {
  const action = community
    ? updateCommunityAction.bind(null, community.id)
    : createCommunityAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const selectedCenter = community?.healthCenterId ?? fixedHealthCenterId ?? "";

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div>
        <label
          className="mb-2 block text-sm font-medium"
          htmlFor="healthCenterId"
        >
          Centro de salud
        </label>
        {fixedHealthCenterId ? (
          <>
            <input
              name="healthCenterId"
              type="hidden"
              value={fixedHealthCenterId}
            />
            <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              {healthCenters.find((center) => center.id === fixedHealthCenterId)
                ?.name ?? "Centro asignado"}
            </p>
          </>
        ) : (
          <select
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            defaultValue={selectedCenter}
            id="healthCenterId"
            name="healthCenterId"
            required
          >
            <option value="">Selecciona un centro de salud</option>
            {healthCenters.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="name">
          Nombre
        </label>
        <input
          className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          defaultValue={community?.name ?? ""}
          id="name"
          name="name"
          placeholder="Nombre de la comunidad"
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="location">
          Ubicación
        </label>
        <input
          className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          defaultValue={community?.location ?? ""}
          id="location"
          name="location"
          placeholder="Referencia o ubicación"
        />
      </div>
      <div>
        <label
          className="mb-2 block text-sm font-medium"
          htmlFor="estimatedFamilies"
        >
          Familias estimadas
        </label>
        <input
          className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          defaultValue={community?.estimatedFamilies ?? ""}
          id="estimatedFamilies"
          min="0"
          name="estimatedFamilies"
          placeholder="Cantidad aproximada"
          type="number"
        />
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
          : community
            ? "Guardar cambios"
            : "Crear comunidad"}
      </Button>
    </form>
  );
}
