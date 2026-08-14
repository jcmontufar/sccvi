import { notFound } from "next/navigation";

import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { HealthCenterForm } from "@/modules/health-centers/components/health-center-form";
import { HealthCenterStatusButton } from "@/modules/health-centers/components/health-center-status-button";
import { getHealthCenter } from "@/modules/health-centers/services/health-center-service";

export default async function HealthCenterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ actualizado?: string }>;
}) {
  const user = await requireApplicationUser();
  const { id } = await params;
  const healthCenter = await getHealthCenter(user, id).catch(() => notFound());
  const { actualizado } = await searchParams;
  const editable = can(user, "health-center:update", { healthCenterId: id });

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-medium text-primary">Centro de salud</p>
        <h1 className="text-3xl font-semibold">{healthCenter.name}</h1>
      </header>
      {actualizado ? (
        <p className="rounded-lg bg-primary/10 p-3 text-sm">
          La información se actualizó correctamente.
        </p>
      ) : null}
      {editable ? (
        <HealthCenterForm healthCenter={healthCenter} />
      ) : (
        <dl className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Código</dt>
            <dd>{healthCenter.code || "No registrado"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Estado</dt>
            <dd>{healthCenter.isActive ? "Activo" : "Inactivo"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Dirección</dt>
            <dd>{healthCenter.address || "No registrada"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Teléfono</dt>
            <dd>{healthCenter.phone || "No registrado"}</dd>
          </div>
        </dl>
      )}
      {can(user, "health-center:change-status", { healthCenterId: id }) ? (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Estado del centro</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            La desactivación conserva toda la información organizacional
            relacionada.
          </p>
          <HealthCenterStatusButton
            id={healthCenter.id}
            isActive={healthCenter.isActive}
          />
        </div>
      ) : null}
    </section>
  );
}
