import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-semibold">Página no encontrada</h1>
        <p className="text-muted-foreground">
          El contenido solicitado no existe o no está disponible para tu perfil.
        </p>
        <Button render={<Link href="/app" />}>Volver al inicio</Button>
      </section>
    </main>
  );
}
