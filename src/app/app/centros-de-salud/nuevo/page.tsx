import { notFound } from "next/navigation";

import { PageBackLink } from "@/components/ui/page-back-link";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { HealthCenterForm } from "@/modules/health-centers/components/health-center-form";

export default async function NewHealthCenterPage() {
  const user = await requireApplicationUser();
  if (!can(user, "health-center:create")) notFound();
  return (
    <section className="space-y-6">
      <PageBackLink
        href="/app/centros-de-salud"
        label="Volver a centros de salud"
      />
      <header>
        <h1 className="text-3xl font-semibold">Crear centro de salud</h1>
        <p className="mt-2 text-muted-foreground">
          Registra un centro de salud para organizar sus comunidades y usuarios.
        </p>
      </header>
      <HealthCenterForm />
    </section>
  );
}
