import { requireApplicationUser } from "@/modules/auth/session";
import { CampaignForm } from "@/modules/campaigns/components/campaign-form";
import { communityService } from "@/modules/communities/queries/prisma-community-repository";

export default async function NewCampaignPage() {
  const user = await requireApplicationUser();
  const communities = await communityService.list(user, {
    search: "",
    status: "active",
    healthCenterId: "",
  });
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Nueva campaña</h1>
        <p className="mt-2 text-muted-foreground">
          Segmenta por comunidad y edad sin usar datos clínicos bloqueados.
        </p>
      </div>
      <CampaignForm communities={communities} />
    </section>
  );
}
