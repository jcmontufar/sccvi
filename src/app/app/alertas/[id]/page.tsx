import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { AlertTransitionButton } from "@/modules/alerts/components/alert-transition-button";
import { getAlert } from "@/modules/alerts/services/alert-service";
import {
  getAlertSourceLabel,
  getGrowthPercentileThresholdLabel,
} from "@/modules/alerts/services/alert-presentation";

const statusLabels = {
  OPEN: "Abierta",
  REVIEWED: "Revisada",
  RESOLVED: "Resuelta",
} as const;
const severityLabels = {
  PREVENTIVE: "Preventiva",
  CRITICAL: "Crítica",
} as const;

export default async function AlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireApplicationUser();
  const alert = await getAlert(user, (await params).id);
  const resource = { healthCenterId: alert.child.community.healthCenterId };
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">{alert.title}</h1>
        <p className="mt-2 text-muted-foreground">
          {alert.child.fullName} · {alert.child.community.name}
        </p>
      </header>
      <article className="space-y-4 rounded-xl border bg-card p-6">
        <p>{alert.message}</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium">Estado</dt>
            <dd>{statusLabels[alert.status]}</dd>
          </div>
          <div>
            <dt className="font-medium">Severidad</dt>
            <dd>{severityLabels[alert.severity]}</dd>
          </div>
          <div>
            <dt className="font-medium">Origen</dt>
            <dd>{getAlertSourceLabel(alert.sourceType)}</dd>
          </div>
          <div>
            <dt className="font-medium">Creada</dt>
            <dd>{alert.createdAt.toLocaleDateString("es-GT")}</dd>
          </div>
        </dl>
        {alert.growthContext ? (
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <h2 className="font-medium">Contexto del control</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Fecha de medición</dt>
                <dd>{alert.growthContext.measurementDate}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Edad al control</dt>
                <dd>{alert.growthContext.ageMonths} meses</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Peso registrado</dt>
                <dd>{alert.growthContext.weightKg} kg</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Percentil peso/edad</dt>
                <dd>{alert.growthContext.percentile.toFixed(3)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Umbral de seguimiento</dt>
                <dd>
                  {getGrowthPercentileThresholdLabel(
                    alert.growthContext.percentile,
                  )}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </article>
      <div className="flex gap-3">
        {alert.status === "OPEN" && can(user, "alert:review", resource) ? (
          <AlertTransitionButton action="review" id={alert.id} />
        ) : null}
        {alert.status === "REVIEWED" && can(user, "alert:resolve", resource) ? (
          <AlertTransitionButton action="resolve" id={alert.id} />
        ) : null}
      </div>
    </section>
  );
}
