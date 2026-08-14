import Link from "next/link";

import { Button } from "@/components/ui/button";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { VaccineStatusButton } from "@/modules/vaccination/components/vaccine-status-button";
import { listVaccines } from "@/modules/vaccination/services/vaccine-service";

export default async function VaccinesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const user = await requireApplicationUser();
  const query = await searchParams;
  const vaccines = await listVaccines(user, {
    search: query.search ?? "",
    status: query.status ?? "active",
  });
  const canManage = can(user, "vaccine:create");
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Catálogo de vacunas</h1>
          <p className="mt-2 text-muted-foreground">
            Metadatos administrativos. No incluye dosis ni calendario oficial.
          </p>
        </div>
        {canManage ? (
          <Button render={<Link href="/app/vacunas/nueva" />}>
            Crear vacuna
          </Button>
        ) : null}
      </header>
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Buscar
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={query.search}
            name="search"
          />
        </label>
        <label className="text-sm font-medium">
          Estado
          <select
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={query.status ?? "active"}
            name="status"
          >
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
            <option value="all">Todas</option>
          </select>
        </label>
        <Button className="sm:w-fit" type="submit">
          Aplicar filtros
        </Button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {vaccines.map((vaccine) => (
          <article
            className="space-y-3 rounded-xl border bg-card p-5"
            key={vaccine.id}
          >
            <div className="flex justify-between gap-3">
              <h2 className="font-semibold">{vaccine.name}</h2>
              <span className="text-sm text-muted-foreground">
                {vaccine.isActive ? "Activa" : "Inactiva"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {vaccine.description || "Sin descripción."}
            </p>
            {canManage ? (
              <div className="flex gap-2">
                <Button
                  render={<Link href={`/app/vacunas/${vaccine.id}/editar`} />}
                  variant="outline"
                >
                  Editar
                </Button>
                <VaccineStatusButton
                  id={vaccine.id}
                  isActive={vaccine.isActive}
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
