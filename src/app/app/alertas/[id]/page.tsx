import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { AlertTransitionButton } from "@/modules/alerts/components/alert-transition-button";
import { getAlert } from "@/modules/alerts/services/alert-service";

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
            <dd>{alert.sourceType ?? "Seguimiento general"}</dd>
          </div>
          <div>
            <dt className="font-medium">Creada</dt>
            <dd>{alert.createdAt.toLocaleDateString("es-GT")}</dd>
          </div>
        </dl>
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
