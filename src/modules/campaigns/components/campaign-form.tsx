"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  createCampaignAction,
  type CampaignFormState,
} from "@/modules/campaigns/actions/campaign-actions";

export function CampaignForm({
  communities,
  vaccinationSchedule,
}: {
  communities: { id: string; name: string }[];
  vaccinationSchedule: {
    code: string;
    name: string;
    doses: { code: string; label: string }[];
  } | null;
}) {
  const [state, action, pending] = useActionState<CampaignFormState, FormData>(
    createCampaignAction,
    {},
  );
  return (
    <form action={action} className="space-y-5 rounded-xl border bg-card p-5">
      <label className="block text-sm font-medium">
        Nombre
        <input
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
          name="name"
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Asunto
        <input
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
          name="subject"
        />
      </label>
      <label className="block text-sm font-medium">
        Mensaje
        <textarea
          className="mt-2 min-h-32 w-full rounded-lg border bg-background p-3"
          name="message"
          required
        />
      </label>
      <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
        <legend className="px-2 font-medium">Segmentación</legend>
        <label className="text-sm">
          Comunidad
          <select
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
            name="communityId"
          >
            <option value="">Todas las autorizadas</option>
            {communities.map((community) => (
              <option key={community.id} value={community.id}>
                {community.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Edad mínima
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
            max="17"
            min="0"
            name="minimumAgeYears"
            type="number"
          />
        </label>
        <label className="text-sm">
          Edad máxima
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
            max="17"
            min="0"
            name="maximumAgeYears"
            type="number"
          />
        </label>
      </fieldset>
      {vaccinationSchedule ? (
        <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <legend className="px-2 font-medium">
            Vacunación por dosis exacta
          </legend>
          <input
            name="scheduleVersionCode"
            type="hidden"
            value={vaccinationSchedule.code}
          />
          <p className="sm:col-span-2 text-sm text-muted-foreground">
            Versión: {vaccinationSchedule.name} ({vaccinationSchedule.code}).
            Deja ambos campos vacíos para no filtrar por vacunación.
          </p>
          <label className="text-sm">
            Dosis
            <select
              className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
              name="doseCode"
            >
              <option value="">Sin filtro de vacunación</option>
              {vaccinationSchedule.doses.map((dose) => (
                <option key={dose.code} value={dose.code}>
                  {dose.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Estado de esa dosis
            <select
              className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
              name="doseStatus"
            >
              <option value="">Sin estado</option>
              <option value="APPLIED">Aplicada</option>
              <option value="PENDING">Pendiente</option>
              <option value="OVERDUE">Atrasada</option>
            </select>
          </label>
        </fieldset>
      ) : null}
      <p className="text-sm text-muted-foreground">
        La campaña se guarda como borrador y su vista previa queda como una
        instantánea. El envío se inicia después desde el detalle.
      </p>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? "Creando…" : "Crear borrador y previsualizar"}
      </Button>
    </form>
  );
}
