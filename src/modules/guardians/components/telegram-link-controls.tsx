"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  createTelegramLinkAction,
  type TelegramLinkState,
  unlinkGuardianTelegramAction,
} from "@/modules/guardians/actions/guardian-actions";

const initialState: TelegramLinkState = {};

export function TelegramLinkControls({
  guardianId,
  linked,
}: {
  guardianId: string;
  linked: boolean;
}) {
  const [state, action, pending] = useActionState(
    createTelegramLinkAction.bind(null, guardianId),
    initialState,
  );
  const [unlinkError, setUnlinkError] = useState<string>();

  if (linked) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Telegram vinculado y disponible para notificaciones.
        </p>
        <Button
          onClick={async () => {
            const result = await unlinkGuardianTelegramAction(guardianId);
            setUnlinkError(result.error);
          }}
          type="button"
          variant="outline"
        >
          Desvincular Telegram
        </Button>
        {unlinkError ? <p role="alert">{unlinkError}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Telegram no está vinculado. El tutor debe abrir el enlace temporal y
        pulsar Start; no se admite ingresar un chat manualmente.
      </p>
      <form action={action}>
        <Button disabled={pending} type="submit" variant="outline">
          {pending ? "Generando…" : "Vincular Telegram"}
        </Button>
      </form>
      {state.url ? (
        <a
          className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          href={state.url}
          rel="noreferrer"
          target="_blank"
        >
          Abrir Telegram
        </a>
      ) : null}
      {state.error ? <p role="alert">{state.error}</p> : null}
    </div>
  );
}
