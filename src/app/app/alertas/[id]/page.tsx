import { PageBackLink } from "@/components/ui/page-back-link";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { AlertTransitionButton } from "@/modules/alerts/components/alert-transition-button";
import { getAlert } from "@/modules/alerts/services/alert-service";
import {
  getAlertSourceLabel,
  getGrowthPercentileThresholdLabel,
} from "@/modules/alerts/services/alert-presentation";
import { ManualAlertNotificationButton } from "@/modules/notifications/components/manual-alert-notification-button";
import {
  listManualAlertNotificationRecipients,
  type ManualAlertNotificationRecipient,
} from "@/modules/notifications/services/manual-alert-notification-service";

const statusLabels = {
  OPEN: "Abierta",
  REVIEWED: "Revisada",
  RESOLVED: "Resuelta",
} as const;
const severityLabels = {
  PREVENTIVE: "Preventiva",
  CRITICAL: "Crítica",
} as const;
const notificationStatusLabels = {
  PENDING: "Pendiente",
  SENT: "Enviada",
  FAILED: "Fallida",
} as const;
const channelLabels = {
  EMAIL: "Correo electrónico",
  TELEGRAM: "Telegram",
  WHATSAPP: "WhatsApp",
} as const;
const ineligibilityLabels = {
  ALERT_TYPE_UNSUPPORTED:
    "Este tipo de alerta no admite notificación al tutor.",
  GUARDIAN_INACTIVE: "El tutor está inactivo.",
  CHANNEL_NOT_SELECTED: "El tutor no tiene un canal preferido.",
  EMAIL_UNAVAILABLE: "El tutor no tiene un correo electrónico disponible.",
  TELEGRAM_UNAVAILABLE: "El tutor no tiene Telegram vinculado y autorizado.",
  CHANNEL_UNSUPPORTED: "El canal preferido no está disponible.",
} as const;

function destinationLabel(recipient: ManualAlertNotificationRecipient): string {
  if (recipient.ineligibilityReason) {
    return ineligibilityLabels[recipient.ineligibilityReason];
  }
  return recipient.preferredChannel === "TELEGRAM"
    ? "Telegram vinculado y autorizado."
    : "Correo electrónico disponible.";
}

export default async function AlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireApplicationUser();
  const alert = await getAlert(user, (await params).id);
  const resource = { healthCenterId: alert.child.community.healthCenterId };
  const notificationRecipients = can(user, "notification:create", resource)
    ? await listManualAlertNotificationRecipients(user, alert.id)
    : [];
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <PageBackLink href="/app/alertas" label="Volver a alertas" />
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
      {can(user, "notification:create", resource) ? (
        <section
          aria-labelledby="guardian-notification-title"
          className="space-y-4 rounded-xl border bg-card p-6"
        >
          <header>
            <h2
              className="text-xl font-semibold"
              id="guardian-notification-title"
            >
              Notificación al tutor
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Envía esta alerta a un solo tutor asociado mediante su canal
              preferido.
            </p>
          </header>
          {notificationRecipients.length ? (
            <ul className="space-y-3">
              {notificationRecipients.map((recipient) => (
                <li
                  className="space-y-3 rounded-lg border p-4"
                  key={recipient.guardianId}
                >
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="font-medium">Tutor asociado</p>
                      <p>{recipient.guardianName}</p>
                    </div>
                    <div>
                      <p className="font-medium">Canal preferido</p>
                      <p>
                        {recipient.preferredChannel
                          ? channelLabels[recipient.preferredChannel]
                          : "Sin seleccionar"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Estado de notificación</p>
                      <p>
                        {recipient.notification
                          ? notificationStatusLabels[
                              recipient.notification.status
                            ]
                          : "No enviada"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {destinationLabel(recipient)}
                  </p>
                  {recipient.notification?.status === "FAILED" ? (
                    <p className="text-sm text-destructive">
                      La entrega falló. No se ofrece reintento porque el canal
                      no garantiza una repetición sin duplicados.
                    </p>
                  ) : null}
                  {recipient.canSend ? (
                    <ManualAlertNotificationButton
                      alertId={alert.id}
                      guardianId={recipient.guardianId}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Este niño no tiene tutores asociados disponibles para mostrar.
            </p>
          )}
        </section>
      ) : null}
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
