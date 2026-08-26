import Link from "next/link";

import { Button } from "@/components/ui/button";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { RefreshFollowUpsButton } from "@/modules/alerts/components/refresh-follow-ups-button";
import { RefreshVaccinationAlertsButton } from "@/modules/alerts/components/refresh-vaccination-alerts-button";
import { listAlerts } from "@/modules/alerts/services/alert-service";

const labels = {
  OPEN: "Abierta",
  REVIEWED: "Revisada",
  RESOLVED: "Resuelta",
  PREVENTIVE: "Preventiva",
  CRITICAL: "Crítica",
} as const;

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string }>;
}) {
  const user = await requireApplicationUser();
  const query = await searchParams;
  const alerts = await listAlerts(user, {
    status: query.status ?? "OPEN",
    severity: query.severity ?? "ALL",
  });
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Alertas</h1>
          <p className="mt-2 text-muted-foreground">
            Seguimiento preventivo. Las alertas no constituyen diagnósticos
            médicos.
          </p>
        </div>
        {can(user, "alert:review") ? (
          <div className="flex flex-wrap gap-2">
            <RefreshFollowUpsButton />
            <RefreshVaccinationAlertsButton />
          </div>
        ) : null}
      </header>
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Estado
          <select
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
            defaultValue={query.status ?? "OPEN"}
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
            defaultValue={query.severity ?? "ALL"}
            name="severity"
          >
            <option value="ALL">Todas</option>
            <option value="PREVENTIVE">Preventiva</option>
            <option value="CRITICAL">Crítica</option>
          </select>
        </label>
        <Button className="sm:w-fit" type="submit">
          Aplicar filtros
        </Button>
      </form>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <article className="rounded-xl border bg-card p-5" key={alert.id}>
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-semibold">{alert.title}</h2>
              <span className="text-sm">
                {labels[alert.status]} · {labels[alert.severity]}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {alert.child.fullName} · {alert.child.community.name}
            </p>
            <Button
              className="mt-4"
              render={<Link href={`/app/alertas/${alert.id}`} />}
              variant="outline"
            >
              Ver detalle
            </Button>
          </article>
        ))}
        {!alerts.length ? (
          <p className="rounded-xl border p-6 text-muted-foreground">
            No hay alertas con estos filtros.
          </p>
        ) : null}
      </div>
    </section>
  );
}
