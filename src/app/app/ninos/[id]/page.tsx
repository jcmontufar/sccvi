import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { ChildNavigation } from "@/modules/children/components/child-navigation";
import { GuardianAssociationForm } from "@/modules/children/components/guardian-association-form";
import { getChild } from "@/modules/children/services/child-service";
import { listGuardians } from "@/modules/guardians/services/guardian-service";

export default async function ChildDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creado?: string; actualizado?: string }>;
}) {
  const user = await requireApplicationUser();
  const { id } = await params;
  const child = await getChild(user, id).catch(() => notFound());
  const query = await searchParams;
  const manageable = can(user, "child:update", {
    healthCenterId: child.community.healthCenterId,
  });
  const canManageGuardians = can(user, "child:manage-guardians", {
    healthCenterId: child.community.healthCenterId,
  });
  const guardians = canManageGuardians
    ? await listGuardians(user, {
        search: "",
        status: "active",
        communityId: "",
      })
    : [];
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Perfil del niño</p>
          <h1 className="text-3xl font-semibold">{child.fullName}</h1>
          <p className="mt-2 text-muted-foreground">
            {child.community.name} — {child.community.healthCenter.name}
          </p>
        </div>
        {manageable ? (
          <Button render={<Link href={`/app/ninos/${child.id}/editar`} />}>
            Editar información
          </Button>
        ) : null}
      </header>
      <ChildNavigation active="summary" childId={child.id} />
      {query.creado || query.actualizado ? (
        <p className="rounded-lg bg-primary/10 p-3 text-sm">
          La información se guardó correctamente.
        </p>
      ) : null}
      <dl className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted-foreground">Fecha de nacimiento</dt>
          <dd>
            {child.dateOfBirth.toLocaleDateString("es-GT", { timeZone: "UTC" })}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Sexo registrado</dt>
          <dd>{child.sex === "MALE" ? "Masculino" : "Femenino"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Estado</dt>
          <dd>{child.isActive ? "Activo" : "Inactivo"}</dd>
        </div>
      </dl>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Tutores asociados</h2>
        {child.childGuardians.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {child.childGuardians.map((relationship) => (
              <article
                className="rounded-lg border bg-card p-4"
                key={relationship.id}
              >
                <Link
                  className="font-medium hover:underline"
                  href={`/app/tutores/${relationship.guardian.id}`}
                >
                  {relationship.guardian.fullName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {relationship.relationshipType || "Relación no especificada"}
                  {relationship.isPrimary ? " · Tutor principal" : ""}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border p-4 text-muted-foreground">
            No hay tutores asociados.
          </p>
        )}
        {canManageGuardians ? (
          <GuardianAssociationForm
            childId={child.id}
            guardians={guardians.filter(
              (guardian) =>
                !child.childGuardians.some(
                  (relation) => relation.guardian.id === guardian.id,
                ),
            )}
          />
        ) : null}
      </section>
    </section>
  );
}
