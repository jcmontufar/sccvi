import { notFound } from "next/navigation";

import { PageBackLink } from "@/components/ui/page-back-link";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import {
  childAccessResource,
  getChild,
} from "@/modules/children/services/child-service";
import { GrowthRecordForm } from "@/modules/growth/components/growth-record-form";
import { getGrowthRecord } from "@/modules/growth/services/growth-record-service";

export default async function CorrectGrowthRecordPage({
  params,
}: {
  params: Promise<{ id: string; recordId: string }>;
}) {
  const user = await requireApplicationUser();
  const { id, recordId } = await params;
  const child = await getChild(user, id).catch(() => notFound());
  if (!can(user, "growth:update", childAccessResource(child))) notFound();
  const record = await getGrowthRecord(user, child.id, recordId).catch(() =>
    notFound(),
  );
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <PageBackLink
        href={`/app/ninos/${child.id}/crecimiento`}
        label="Volver a crecimiento"
      />
      <header>
        <p className="text-sm font-medium text-primary">
          Crecimiento · {child.fullName}
        </p>
        <h1 className="text-3xl font-semibold">Corregir medición</h1>
        <p className="mt-2 text-muted-foreground">
          La corrección quedará registrada para mantener la trazabilidad
          histórica.
        </p>
      </header>
      <GrowthRecordForm childId={child.id} record={record} />
    </section>
  );
}
