import { notFound } from "next/navigation";

import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import {
  childAccessResource,
  getChild,
} from "@/modules/children/services/child-service";
import { GrowthRecordForm } from "@/modules/growth/components/growth-record-form";

export default async function NewGrowthRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireApplicationUser();
  const { id } = await params;
  const child = await getChild(user, id).catch(() => notFound());
  if (!can(user, "growth:create", childAccessResource(child))) notFound();
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-medium text-primary">
          Crecimiento · {child.fullName}
        </p>
        <h1 className="text-3xl font-semibold">Registrar medición</h1>
        <p className="mt-2 text-muted-foreground">
          Registra los datos factuales observados durante el control.
        </p>
      </header>
      <GrowthRecordForm childId={child.id} />
    </section>
  );
}
