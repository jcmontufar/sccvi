import { notFound } from "next/navigation";

import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { ChildForm } from "@/modules/children/components/child-form";
import { getChild } from "@/modules/children/services/child-service";
import { communityService } from "@/modules/communities/queries/prisma-community-repository";

export default async function EditChildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireApplicationUser();
  const { id } = await params;
  const child = await getChild(user, id).catch(() => notFound());
  if (
    !can(user, "child:update", {
      healthCenterId: child.community.healthCenterId,
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
        <p className="text-sm font-medium text-primary">Niños</p>
        <h1 className="text-3xl font-semibold">Editar información del niño</h1>
      </header>
      <ChildForm child={child} communities={communities} />
    </section>
  );
}
