import { notFound } from "next/navigation";

import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { communityService } from "@/modules/communities/queries/prisma-community-repository";
import { GuardianForm } from "@/modules/guardians/components/guardian-form";
import { getGuardian } from "@/modules/guardians/services/guardian-service";

export default async function EditGuardianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireApplicationUser();
  const { id } = await params;
  const guardian = await getGuardian(user, id).catch(() => notFound());
  if (
    !can(user, "guardian:update", {
      healthCenterId: guardian.community.healthCenterId,
    })
  )
    notFound();
  const communities = await communityService.list(user, {
    search: "",
    status: "active",
    healthCenterId: "",
  });
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-medium text-primary">Tutores</p>
        <h1 className="text-3xl font-semibold">Editar tutor o responsable</h1>
      </header>
      <GuardianForm communities={communities} guardian={guardian} />
    </section>
  );
}
