"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setVaccineActiveAction } from "@/modules/vaccination/actions/vaccine-actions";

export function VaccineStatusButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setVaccineActiveAction(id, !isActive);
            setError(result.error);
          })
        }
        type="button"
        variant="outline"
      >
        {isActive ? "Desactivar" : "Reactivar"}
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
