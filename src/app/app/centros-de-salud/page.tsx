import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireApplicationUser } from "@/modules/auth/session";
import { listHealthCenters } from "@/modules/health-centers/services/health-center-service";

export default async function HealthCentersPage() {
  const user = await requireApplicationUser();
  const healthCenters = await listHealthCenters(user);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Centros de salud</h1>
        <p className="mt-2 text-muted-foreground">
          Consulta la información organizacional autorizada.
        </p>
      </header>
      {healthCenters.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {healthCenters.map((center) => (
            <article
              className="space-y-3 rounded-xl border bg-card p-5"
              key={center.id}
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-semibold">{center.name}</h2>
                <span className="text-sm text-muted-foreground">
                  {center.isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {center.address || "Sin dirección registrada"}
              </p>
              <Button
                render={<Link href={`/app/centros-de-salud/${center.id}`} />}
                variant="outline"
              >
                Ver información
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border p-6 text-muted-foreground">
          No hay centros de salud disponibles para tu perfil.
        </p>
      )}
    </section>
  );
}
