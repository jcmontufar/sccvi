import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6 sm:p-10">
      <section className="w-full max-w-xl space-y-6 rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-10">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Fundación de interfaz configurada
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            SCCVI
          </h1>
          <p className="text-pretty text-muted-foreground">
            Sistema de Control de Crecimiento y Vacunación Infantil
          </p>
        </div>
        <Button render={<Link href="/iniciar-sesion" />}>Ingresar</Button>
      </section>
    </main>
  );
}
