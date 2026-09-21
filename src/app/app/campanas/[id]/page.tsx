import { PageBackLink } from "@/components/ui/page-back-link";
import { requireApplicationUser } from "@/modules/auth/session";
import { CampaignSendButton } from "@/modules/campaigns/components/campaign-send-button";
import { getCampaign } from "@/modules/campaigns/services/campaign-service";

const campaignStatusLabels = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  PROCESSING: "En proceso",
  COMPLETED: "Completada",
  FAILED: "Fallida",
} as const;
const recipientStatusLabels = {
  PENDING: "Pendiente",
  SENT: "Enviado",
  FAILED: "Fallido",
  SKIPPED: "Omitido",
} as const;

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enviada?: string }>;
}) {
  const campaign = await getCampaign(
    await requireApplicationUser(),
    (await params).id,
  );
  const sent = (await searchParams).enviada === "1";
  const counts = campaign.recipients.reduce(
    (summary, recipient) => ({
      ...summary,
      [recipient.status]: summary[recipient.status] + 1,
    }),
    { PENDING: 0, SENT: 0, FAILED: 0, SKIPPED: 0 },
  );
  return (
    <section className="space-y-6">
      <PageBackLink href="/app/campanas" label="Volver a campañas" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{campaign.name}</h1>
          <p className="mt-2 text-muted-foreground">
            Estado: {campaignStatusLabels[campaign.status]} · Creada por{" "}
            {campaign.createdBy.fullName}
          </p>
        </div>
        {campaign.status === "DRAFT" ? (
          <CampaignSendButton campaignId={campaign.id} />
        ) : null}
      </header>
      {sent ? (
        <p className="rounded-xl border p-4 text-sm">
          El proceso de entrega terminó. Revisa los resultados registrados.
        </p>
      ) : null}
      <article className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Mensaje</h2>
        <p className="mt-3 whitespace-pre-wrap">{campaign.message}</p>
      </article>
      <section className="grid gap-3 sm:grid-cols-4">
        {Object.entries(counts).map(([status, count]) => (
          <article className="rounded-xl border bg-card p-4" key={status}>
            <p className="text-sm text-muted-foreground">
              {
                recipientStatusLabels[
                  status as keyof typeof recipientStatusLabels
                ]
              }
            </p>
            <p className="mt-1 text-2xl font-semibold">{count}</p>
          </article>
        ))}
      </section>
      <section>
        <h2 className="text-xl font-semibold">Destinatarios</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Instantánea determinada al crear la campaña. Antes del envío se
          revalida únicamente que cada tutor todavía pueda recibir correo.
        </p>
        <ul className="mt-4 divide-y rounded-xl border bg-card">
          {campaign.recipients.map((recipient) => (
            <li
              className="flex flex-wrap justify-between gap-2 p-4"
              key={recipient.id}
            >
              <span>{recipient.guardian.fullName}</span>
              <span className="text-sm text-muted-foreground">
                {recipientStatusLabels[recipient.status]}
              </span>
            </li>
          ))}
          {!campaign.recipients.length ? (
            <li className="p-4 text-sm text-muted-foreground">
              No se encontraron destinatarios para esta segmentación.
            </li>
          ) : null}
        </ul>
      </section>
      <p className="rounded-xl border p-4 text-sm text-muted-foreground">
        Los correos se registran como enviados únicamente cuando el proveedor
        confirma la entrega. Esta campaña no contiene una interpretación clínica
        ni modifica el esquema de vacunación.
      </p>
    </section>
  );
}
