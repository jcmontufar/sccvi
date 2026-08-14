import { requireApplicationUser } from "@/modules/auth/session";
import { getCampaign } from "@/modules/campaigns/services/campaign-service";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const campaign = await getCampaign(
    await requireApplicationUser(),
    (await params).id,
  );
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">{campaign.name}</h1>
        <p className="mt-2 text-muted-foreground">
          Estado: Borrador · Creada por {campaign.createdBy.fullName}
        </p>
      </header>
      <article className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Mensaje</h2>
        <p className="mt-3 whitespace-pre-wrap">{campaign.message}</p>
      </article>
      <section>
        <h2 className="text-xl font-semibold">Vista previa de destinatarios</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo tutores activos con correo y niños dentro del alcance autorizado.
        </p>
        <ul className="mt-4 divide-y rounded-xl border bg-card">
          {campaign.recipients.map((recipient) => (
            <li className="p-4" key={recipient.id}>
              {recipient.guardian.fullName} · {recipient.guardian.email}
            </li>
          ))}
        </ul>
      </section>
      <p className="rounded-xl border p-4 text-sm text-muted-foreground">
        No se ha enviado ningún mensaje. La integración con proveedor de correo
        permanece bloqueada.
      </p>
    </section>
  );
}
