"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setGuardianActiveAction } from "@/modules/guardians/actions/guardian-actions";

export function GuardianStatusButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () =>
            setError((await setGuardianActiveAction(id, !isActive)).error),
          )
        }
        type="button"
        variant={isActive ? "destructive" : "outline"}
      >
        {pending ? "Actualizando…" : isActive ? "Desactivar" : "Reactivar"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
