import { notFound } from "next/navigation";

import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { communityService } from "@/modules/communities/queries/prisma-community-repository";
import { GuardianForm } from "@/modules/guardians/components/guardian-form";

export default async function NewGuardianPage() {
  const user = await requireApplicationUser();
  if (
    !can(user, "guardian:create", { healthCenterId: user.healthCenterId }) &&
    user.role !== "ADMIN"
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
        <h1 className="text-3xl font-semibold">
          Registrar tutor o responsable
        </h1>
      </header>
      <GuardianForm communities={communities} />
    </section>
  );
}
