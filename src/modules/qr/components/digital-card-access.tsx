"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  accessDigitalCardAction,
  type DigitalCardState,
} from "@/modules/qr/actions/qr-actions";

function Card({ child }: { child: NonNullable<DigitalCardState["child"]> }) {
  return (
    <article className="space-y-3 rounded-xl border bg-card p-6">
      <h2 className="text-2xl font-semibold">{child.fullName}</h2>
      <p>Fecha de nacimiento: {child.dateOfBirth}</p>
      <p>Sexo registrado: {child.sex === "MALE" ? "Masculino" : "Femenino"}</p>
      <p className="text-sm text-muted-foreground">
        Esta tarjeta confirma datos básicos. No muestra historial médico,
        mediciones ni vacunas.
      </p>
    </article>
  );
}

export function DigitalCardAccess({
  rawToken,
  initialChild,
  initialError,
  pinRequired,
}: {
  rawToken: string;
  initialChild?: DigitalCardState["child"];
  initialError?: string;
  pinRequired: boolean;
}) {
  const [state, action, pending] = useActionState<DigitalCardState, FormData>(
    accessDigitalCardAction.bind(null, rawToken),
    initialChild ? { child: initialChild } : { error: initialError },
  );
  if (state.child) return <Card child={state.child} />;
  if (!pinRequired)
    return (
      <p className="rounded-xl border p-5 text-destructive">
        {state.error ?? "No fue posible consultar la tarjeta digital."}
      </p>
    );
  return (
    <form action={action} className="space-y-4 rounded-xl border bg-card p-6">
      <p>
        Esta tarjeta está protegida. Ingresa el PIN entregado por el centro de
        salud.
      </p>
      <label className="block text-sm font-medium">
        PIN
        <input
          autoFocus
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
          inputMode="numeric"
          name="pin"
          pattern="[0-9]{6,12}"
          required
          type="password"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? "Verificando…" : "Ver tarjeta"}
      </Button>
    </form>
  );
}
