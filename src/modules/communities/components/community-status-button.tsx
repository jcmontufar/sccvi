"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setCommunityActiveAction } from "@/modules/communities/actions/community-actions";

export function CommunityStatusButton({
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
            const result = await setCommunityActiveAction(id, !isActive);
            setError(result.error);
          })
        }
        type="button"
        variant={isActive ? "destructive" : "outline"}
      >
        {pending ? "Actualizando…" : isActive ? "Desactivar" : "Reactivar"}
      </Button>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
