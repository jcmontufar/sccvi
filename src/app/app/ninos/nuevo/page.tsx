import { notFound } from "next/navigation";

import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { ChildForm } from "@/modules/children/components/child-form";
import { communityService } from "@/modules/communities/queries/prisma-community-repository";

export default async function NewChildPage() {
  const user = await requireApplicationUser();
  if (
    !can(user, "child:create", { healthCenterId: user.healthCenterId }) &&
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
        <p className="text-sm font-medium text-primary">Niños</p>
        <h1 className="text-3xl font-semibold">Registrar niño</h1>
      </header>
      <ChildForm communities={communities} />
    </section>
  );
}
