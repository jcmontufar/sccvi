"use client";

import { Button } from "@/components/ui/button";

export default function ProtectedAreaError({ reset }: { reset: () => void }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-6">
      <h1 className="text-2xl font-semibold">
        No fue posible cargar esta sección
      </h1>
      <p className="text-muted-foreground">
        Verifica que tengas acceso o inténtalo nuevamente. Si el problema
        continúa, comunícate con la administración.
      </p>
      <Button onClick={reset} type="button">
        Intentar de nuevo
      </Button>
    </section>
  );
}
