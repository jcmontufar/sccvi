import { notFound } from "next/navigation";

import { PageBackLink } from "@/components/ui/page-back-link";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { listHealthCenters } from "@/modules/health-centers/services/health-center-service";
import { UserForm } from "@/modules/users/components/user-form";
import { UserStatusButton } from "@/modules/users/components/user-status-button";
import {
  getUser,
  listAvailableGuardians,
} from "@/modules/users/services/user-service";

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ actualizado?: string }>;
}) {
  const actor = await requireApplicationUser();
  if (!can(actor, "user:read")) notFound();
  const { id } = await params;
  const [user, centers, guardians, query] = await Promise.all([
    getUser(actor, id),
    listHealthCenters(actor),
    listAvailableGuardians(actor, id),
    searchParams,
  ]);
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageBackLink href="/app/usuarios" label="Volver a usuarios" />
      <header>
        <h1 className="text-3xl font-semibold">Detalle del usuario</h1>
        <p className="mt-2 text-muted-foreground">
          Cuenta {user.isActive ? "activa" : "inactiva"}. El correo de acceso
          permanece fijo.
        </p>
      </header>
      {query.actualizado ? (
        <p className="rounded-lg bg-primary/10 p-3 text-sm">
          Los cambios se guardaron correctamente.
        </p>
      ) : null}
      <UserForm
        user={user}
        centers={centers.filter(
          (center) => center.isActive || center.id === user.healthCenterId,
        )}
        guardians={guardians}
      />
      {actor.id !== user.id ? (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-lg font-semibold">Estado de acceso</h2>
          <UserStatusButton id={user.id} isActive={user.isActive} />
        </div>
      ) : null}
    </section>
  );
}
