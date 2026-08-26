import Link from "next/link";

import { Button } from "@/components/ui/button";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { ChildNavigation } from "@/modules/children/components/child-navigation";
import { listChildVaccinationStatuses } from "@/modules/vaccination/services/vaccination-service";

const statusLabels = {
  APPLIED: "Aplicada",
  PENDING: "Pendiente",
  OVERDUE: "Atrasada",
} as const;

export default async function ChildVaccinationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ registrada?: string }>;
}) {
  const user = await requireApplicationUser();
  const result = await listChildVaccinationStatuses(user, (await params).id);
  const canRegister = can(user, "vaccination:create", {
    healthCenterId: result.child.community.healthCenterId,
  });
  const canManageDigitalCard = can(user, "qr:manage", {
    healthCenterId: result.child.community.healthCenterId,
  });
  const counts = result.doses.reduce(
    (values, dose) => ({ ...values, [dose.status]: values[dose.status] + 1 }),
    { APPLIED: 0, PENDING: 0, OVERDUE: 0 },
  );
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Vacunación</p>
          <h1 className="text-3xl font-semibold">{result.child.fullName}</h1>
          <p className="mt-2 text-muted-foreground">
            Esquema {result.version.code}. Seguimiento preventivo basado en el
            registro disponible.
          </p>
        </div>
        {canRegister ? (
          <Button
            render={
              <Link href={`/app/ninos/${result.child.id}/vacunacion/nueva`} />
            }
          >
            Registrar vacuna
          </Button>
        ) : null}
      </header>
      <ChildNavigation
        active="vaccination"
        canManageDigitalCard={canManageDigitalCard}
        childId={result.child.id}
      />
      {(await searchParams).registrada ? (
        <p className="rounded-lg bg-primary/10 p-3 text-sm">
          La vacuna se registró correctamente.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {(["APPLIED", "PENDING", "OVERDUE"] as const).map((status) => (
          <article className="rounded-xl border bg-card p-4" key={status}>
            <p className="text-sm text-muted-foreground">
              {status === "APPLIED"
                ? "Aplicadas"
                : status === "PENDING"
                  ? "Pendientes"
                  : "Atrasadas"}
            </p>
            <p className="mt-1 text-2xl font-semibold">{counts[status]}</p>
          </article>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {result.doses.map((dose) => (
          <article className="rounded-xl border bg-card p-5" key={dose.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{dose.vaccineName}</h2>
                <p className="text-sm text-muted-foreground">{dose.doseName}</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-sm">
                {statusLabels[dose.status]}
              </span>
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">
                  Fecha programada o ventana
                </dt>
                <dd>{dose.timingNote ?? dose.scheduledDate}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fecha de aplicación</dt>
                <dd>{dose.applicationDate ?? "Sin registro"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <p className="rounded-xl border p-4 text-sm text-muted-foreground">
        “Pendiente” y “Atrasada” son estados de seguimiento. No constituyen un
        diagnóstico ni sustituyen la evaluación del personal de salud.
      </p>
    </section>
  );
}
