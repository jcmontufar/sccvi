import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageBackLink } from "@/components/ui/page-back-link";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { ChildNavigation } from "@/modules/children/components/child-navigation";
import { VaccinationSummaryChart } from "@/modules/vaccination/components/vaccination-summary-chart";
import { listChildVaccinationStatuses } from "@/modules/vaccination/services/vaccination-service";
import {
  buildVaccinationTimeline,
  getVaccinationAttention,
} from "@/modules/vaccination/services/vaccination-timeline";

const statusPresentation = {
  APPLIED: {
    label: "Aplicada",
    plural: "Aplicadas",
    symbol: "✓",
    badge: "bg-success/10 text-success ring-success/20",
    icon: "bg-success text-success-foreground",
  },
  PENDING: {
    label: "Pendiente",
    plural: "Pendientes",
    symbol: "○",
    badge: "bg-warning/10 text-warning ring-warning/25",
    icon: "bg-warning/10 text-warning ring-1 ring-warning/25",
  },
  OVERDUE: {
    label: "Atrasada",
    plural: "Atrasadas",
    symbol: "⚠",
    badge: "bg-destructive/10 text-destructive ring-destructive/20",
    icon: "bg-destructive text-destructive-foreground",
  },
} as const;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

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
  const timeline = buildVaccinationTimeline(
    result.child.dateOfBirth.toISOString().slice(0, 10),
    result.doses,
  );
  const attention = getVaccinationAttention(result.doses);

  return (
    <section className="space-y-6">
      <PageBackLink
        href={`/app/ninos/${result.child.id}`}
        label="Volver al perfil"
      />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">
            Carné de vacunación
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {result.child.fullName}
          </h1>
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
            size="lg"
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
        <p
          className="rounded-xl border border-success/20 bg-success/10 p-3 text-sm text-success"
          role="status"
        >
          La vacuna se registró correctamente.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <section
          aria-label="Resumen del estado de vacunación"
          className="grid gap-3 sm:grid-cols-3"
        >
          {(["APPLIED", "PENDING", "OVERDUE"] as const).map((status) => {
            const presentation = statusPresentation[status];
            return (
              <article
                className="rounded-2xl border bg-card p-4 shadow-sm"
                key={status}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {presentation.plural}
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {counts[status]}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className={`flex size-10 items-center justify-center rounded-xl text-lg font-semibold ${presentation.icon}`}
                  >
                    {presentation.symbol}
                  </span>
                </div>
              </article>
            );
          })}
        </section>
        <article className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="font-semibold">Resumen visual</h2>
          <p className="text-sm text-muted-foreground">Dosis aplicables</p>
          <VaccinationSummaryChart counts={counts} />
        </article>
      </div>

      <article className="rounded-2xl border border-primary/70 bg-gradient-to-br from-primary to-[#063e50] p-5 text-white shadow-sm">
        <div className="mb-4">
          <p className="text-sm font-medium text-secondary">
            Prioridad operativa
          </p>
          <h2 className="text-xl font-semibold">Atención requerida</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/70">Dosis atrasadas</p>
            {attention.overdue.length ? (
              <>
                <p className="mt-1 text-2xl font-semibold">
                  {attention.overdue.length}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-white/80">
                  {attention.overdue.slice(0, 3).map((dose) => (
                    <li key={dose.id}>
                      {dose.vaccineName} · {dose.doseName}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/80">
                No hay dosis atrasadas.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/70">Próxima dosis pendiente</p>
            {attention.nextPending ? (
              <>
                <p className="mt-1 font-semibold">
                  {attention.nextPending.vaccineName}
                </p>
                <p className="text-sm text-white/80">
                  {attention.nextPending.doseName} · Fecha objetivo:{" "}
                  {formatDate(attention.nextPending.scheduledDate)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/80">
                No hay dosis pendientes en el esquema aplicable.
              </p>
            )}
          </div>
        </div>
        {canRegister && (attention.overdue.length || attention.nextPending) ? (
          <Button
            className="mt-4 bg-white text-primary hover:bg-white/90"
            render={
              <Link href={`/app/ninos/${result.child.id}/vacunacion/nueva`} />
            }
          >
            Registrar aplicación
          </Button>
        ) : null}
      </article>

      <section>
        <div className="mb-4">
          <p className="text-sm font-medium text-primary">
            Esquema cronológico
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Dosis por edad o etapa
          </h2>
        </div>
        {timeline.length ? (
          <ol className="relative space-y-5 before:absolute before:top-3 before:bottom-3 before:left-[1.15rem] before:w-px before:bg-border sm:before:left-28">
            {timeline.map((stage) => (
              <li
                className="relative grid gap-3 pl-12 sm:grid-cols-[6rem_1fr] sm:pl-0"
                key={stage.scheduledDate}
              >
                <div className="sm:text-right">
                  <p className="text-sm font-semibold text-primary">
                    {stage.stageLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(stage.scheduledDate)}
                  </p>
                </div>
                <span className="absolute top-1 left-3.5 size-4 rounded-full border-4 border-background bg-primary ring-1 ring-primary/25 sm:left-[6.55rem]" />
                <div className="grid gap-3 md:grid-cols-2">
                  {stage.doses.map((dose) => {
                    const presentation = statusPresentation[dose.status];
                    return (
                      <article
                        className="rounded-2xl border bg-card p-4 shadow-sm"
                        key={dose.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">
                              {dose.vaccineName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {dose.doseName}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${presentation.badge}`}
                          >
                            <span aria-hidden="true">
                              {presentation.symbol}{" "}
                            </span>
                            {presentation.label}
                          </span>
                        </div>
                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              Fecha objetivo
                            </dt>
                            <dd className="font-medium">
                              {formatDate(dose.scheduledDate)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              Fecha de aplicación
                            </dt>
                            <dd className="font-medium">
                              {dose.applicationDate
                                ? formatDate(dose.applicationDate)
                                : "Sin registro"}
                            </dd>
                          </div>
                          {dose.timingNote ? (
                            <div className="sm:col-span-2">
                              <dt className="text-xs text-muted-foreground">
                                Ventana o indicación del esquema
                              </dt>
                              <dd>{dose.timingNote}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </article>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
            <h3 className="font-medium">Sin dosis aplicables</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No hay dosis del esquema vigente aplicables a este niño.
            </p>
          </div>
        )}
      </section>

      <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        “Pendiente” y “Atrasada” son estados de seguimiento. No constituyen un
        diagnóstico ni sustituyen la evaluación del personal de salud.
      </p>
    </section>
  );
}
