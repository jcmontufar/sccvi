import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireApplicationUser } from "@/modules/auth/session";
import { listCampaigns } from "@/modules/campaigns/services/campaign-service";

const campaignStatusLabels = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  PROCESSING: "En proceso",
  COMPLETED: "Completada",
  FAILED: "Fallida",
} as const;

export default async function CampaignsPage() {
  const campaigns = await listCampaigns(await requireApplicationUser());
  return (
    <section className="space-y-6">
      <header className="flex justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Campañas</h1>
          <p className="mt-2 text-muted-foreground">
            Borradores, destinatarios y resultados de entrega por correo.
          </p>
        </div>
        <Button render={<Link href="/app/campanas/nueva" />}>
          Nueva campaña
        </Button>
      </header>
      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <article
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-5"
            key={campaign.id}
          >
            <div>
              <h2 className="font-semibold">{campaign.name}</h2>
              <p className="text-sm text-muted-foreground">
                {campaign._count.recipients} destinatarios ·{" "}
                {campaignStatusLabels[campaign.status]}
              </p>
            </div>
            <Button
              render={<Link href={`/app/campanas/${campaign.id}`} />}
              variant="outline"
            >
              Ver campaña
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
