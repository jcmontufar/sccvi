import { notFound } from "next/navigation";

import { PageBackLink } from "@/components/ui/page-back-link";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { listHealthCenters } from "@/modules/health-centers/services/health-center-service";
import { UserForm } from "@/modules/users/components/user-form";
import { listAvailableGuardians } from "@/modules/users/services/user-service";

export default async function NewUserPage() {
  const actor = await requireApplicationUser();
  if (!can(actor, "user:create")) notFound();
  const [centers, guardians] = await Promise.all([
    listHealthCenters(actor),
    listAvailableGuardians(actor),
  ]);
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageBackLink href="/app/usuarios" label="Volver a usuarios" />
      <header>
        <h1 className="text-3xl font-semibold">Crear usuario</h1>
        <p className="mt-2 text-muted-foreground">
          Se enviará una invitación para establecer el acceso.
        </p>
      </header>
      <UserForm
        centers={centers.filter((center) => center.isActive)}
        guardians={guardians}
      />
    </section>
  );
}
