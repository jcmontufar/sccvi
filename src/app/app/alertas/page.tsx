import Link from "next/link";

import { Button } from "@/components/ui/button";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { RefreshFollowUpsButton } from "@/modules/alerts/components/refresh-follow-ups-button";
import { RefreshVaccinationAlertsButton } from "@/modules/alerts/components/refresh-vaccination-alerts-button";
import {
  buildOpenAlertSummary,
  getAlertSourceLabel,
} from "@/modules/alerts/services/alert-presentation";
import {
  getAlertSummary,
  listAlerts,
} from "@/modules/alerts/services/alert-service";

const statusLabels = {
  OPEN: "Abierta",
  REVIEWED: "Revisada",
  RESOLVED: "Resuelta",
} as const;

const severityPresentation = {
  PREVENTIVE: {
    label: "Preventiva",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
    symbol: "○",
  },
  CRITICAL: {
    label: "Crítica",
    className: "bg-rose-50 text-rose-800 ring-rose-200",
    symbol: "!",
  },
} as const;

const typePresentation = {
  GROWTH: {
    label: "Crecimiento",
    className: "bg-sky-50 text-sky-800",
    symbol: "↗",
  },
  VACCINATION: {
    label: "Vacunación",
    className: "bg-teal-50 text-teal-800",
    symbol: "✓",
  },
  MISSED_FOLLOW_UP: {
    label: "Seguimiento",
    className: "bg-violet-50 text-violet-800",
    symbol: "◷",
  },
} as const;

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    severity?: string;
    type?: string;
  }>;
}) {
  const user = await requireApplicationUser();
  const query = await searchParams;
  const filters = {
    status: query.status ?? "OPEN",
    severity: query.severity ?? "ALL",
    type: query.type ?? "ALL",
  };
  const [alerts, summaryGroups] = await Promise.all([
    listAlerts(user, filters),
    getAlertSummary(user),
  ]);
  const summary = buildOpenAlertSummary(
    summaryGroups.map((group) => ({
      status: group.status,
      severity: group.severity,
      type: group.type,
      count: group._count._all,
    })),
  );
  const hasFilters =
    filters.status !== "OPEN" ||
    filters.severity !== "ALL" ||
    filters.type !== "ALL";

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-medium text-sky-700">Bandeja operativa</p>
        <h1 className="text-3xl font-semibold tracking-tight">Alertas</h1>
        <p className="mt-2 text-muted-foreground">
          Prioriza seguimientos preventivos. Las alertas no constituyen
          diagnósticos médicos.
        </p>
      </header>

      <section
        aria-label="Resumen de alertas abiertas"
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          {
            label: "Abiertas",
            value: summary.open,
            tone: "bg-sky-50 text-sky-700",
            symbol: "◎",
          },
          {
            label: "Preventivas",
            value: summary.preventive,
            tone: "bg-amber-50 text-amber-700",
            symbol: "○",
          },
          {
            label: "Críticas",
            value: summary.critical,
            tone: "bg-rose-50 text-rose-700",
            symbol: "!",
          },
        ].map((item) => (
          <article
            className="rounded-2xl border bg-card p-4 shadow-sm"
            key={item.label}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold">{item.value}</p>
              </div>
              <span
                aria-hidden="true"
                className={`flex size-10 items-center justify-center rounded-xl text-lg font-semibold ${item.tone}`}
              >
                {item.symbol}
              </span>
            </div>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border bg-card px-3 py-1.5">
          Crecimiento: {summary.byType.growth}
        </span>
        <span className="rounded-full border bg-card px-3 py-1.5">
          Vacunación: {summary.byType.vaccination}
        </span>
        <span className="rounded-full border bg-card px-3 py-1.5">
          Seguimientos: {summary.byType.followUp}
        </span>
      </div>

      {can(user, "alert:review") ? (
        <aside className="rounded-2xl border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Actualizar alertas operativas</h2>
              <p className="text-sm text-muted-foreground">
                Revisa seguimientos vencidos y dosis atrasadas con los controles
                existentes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <RefreshFollowUpsButton />
              <RefreshVaccinationAlertsButton />
            </div>
          </div>
        </aside>
      ) : null}

      <form className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium">
            Estado
            <select
              className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.status}
              name="status"
            >
              <option value="OPEN">Abiertas</option>
              <option value="REVIEWED">Revisadas</option>
              <option value="RESOLVED">Resueltas</option>
              <option value="ALL">Todas</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Severidad
            <select
              className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.severity}
              name="severity"
            >
              <option value="ALL">Todas</option>
              <option value="PREVENTIVE">Preventiva</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Tipo
            <select
              className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
              defaultValue={filters.type}
              name="type"
            >
              <option value="ALL">Todos</option>
              <option value="GROWTH">Crecimiento</option>
              <option value="VACCINATION">Vacunación</option>
              <option value="MISSED_FOLLOW_UP">Seguimiento vencido</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit">Aplicar filtros</Button>
          {hasFilters ? (
            <Button
              render={<Link href="/app/alertas" />}
              type="button"
              variant="ghost"
            >
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </form>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const type = typePresentation[alert.type];
          const severity = severityPresentation[alert.severity];
          return (
            <article
              className={`rounded-2xl border bg-card p-5 shadow-sm ${
                alert.severity === "CRITICAL"
                  ? "border-l-4 border-l-rose-500"
                  : "border-l-4 border-l-amber-400"
              }`}
              key={alert.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg font-semibold ${type.className}`}
                  >
                    {type.symbol}
                  </span>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        {type.label}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${severity.className}`}
                      >
                        <span aria-hidden="true">{severity.symbol} </span>
                        {severity.label}
                      </span>
                      <span className="rounded-full border px-2.5 py-1 text-xs font-medium">
                        {statusLabels[alert.status]}
                      </span>
                    </div>
                    <h2 className="font-semibold">{alert.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {alert.child.fullName} · {alert.child.community.name}
                    </p>
                  </div>
                </div>
                <Button
                  render={<Link href={`/app/alertas/${alert.id}`} />}
                  variant="outline"
                >
                  Revisar
                </Button>
              </div>
              <dl className="mt-4 grid gap-2 border-t pt-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Contexto</dt>
                  <dd className="font-medium">
                    {getAlertSourceLabel(alert.sourceType)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fecha de creación</dt>
                  <dd className="font-medium">
                    {alert.createdAt.toLocaleDateString("es-GT", {
                      dateStyle: "medium",
                      timeZone: "America/Guatemala",
                    })}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
        {!alerts.length ? (
          <div className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
            <h2 className="font-medium">No hay alertas para mostrar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajusta los filtros o vuelve a revisar más adelante.
            </p>
            {hasFilters ? (
              <Button
                className="mt-4"
                render={<Link href="/app/alertas" />}
                variant="outline"
              >
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
