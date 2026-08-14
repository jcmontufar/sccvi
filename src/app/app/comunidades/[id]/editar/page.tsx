import { notFound } from "next/navigation";

import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { CommunityForm } from "@/modules/communities/components/community-form";
import { communityService } from "@/modules/communities/queries/prisma-community-repository";
import { listHealthCenters } from "@/modules/health-centers/services/health-center-service";

export default async function EditCommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireApplicationUser();
  const { id } = await params;
  const community = await communityService
    .get(user, id)
    .catch(() => notFound());
  if (
    !can(user, "community:update", { healthCenterId: community.healthCenterId })
  )
    notFound();
  const healthCenters = await listHealthCenters(user);
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-medium text-primary">Comunidades</p>
        <h1 className="text-3xl font-semibold">Editar comunidad</h1>
      </header>
      <CommunityForm
        community={community}
        fixedHealthCenterId={community.healthCenterId}
        healthCenters={healthCenters}
      />
    </section>
  );
}
