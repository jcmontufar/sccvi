import { notFound } from "next/navigation";

import { PageBackLink } from "@/components/ui/page-back-link";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { CommunityForm } from "@/modules/communities/components/community-form";
import { listHealthCenters } from "@/modules/health-centers/services/health-center-service";

export default async function NewCommunityPage() {
  const user = await requireApplicationUser();
  if (
    !can(user, "community:create", { healthCenterId: user.healthCenterId }) &&
    user.role !== "ADMIN"
  )
    notFound();
  const healthCenters = (await listHealthCenters(user)).filter(
    (center) => center.isActive,
  );
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageBackLink href="/app/comunidades" label="Volver a comunidades" />
      <header>
        <p className="text-sm font-medium text-primary">Comunidades</p>
        <h1 className="text-3xl font-semibold">Crear comunidad</h1>
      </header>
      <CommunityForm
        fixedHealthCenterId={
          user.role === "ADMIN" ? undefined : (user.healthCenterId ?? undefined)
        }
        healthCenters={healthCenters}
      />
    </section>
  );
}
