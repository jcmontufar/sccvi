"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setHealthCenterActiveAction } from "@/modules/health-centers/actions/health-center-actions";

export function HealthCenterStatusButton({
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
          startTransition(async () => {
            const result = await setHealthCenterActiveAction(id, !isActive);
            setError(result.error);
          })
        }
        type="button"
        variant={isActive ? "destructive" : "outline"}
      >
        {pending
          ? "Actualizando…"
          : isActive
            ? "Desactivar centro"
            : "Reactivar centro"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
