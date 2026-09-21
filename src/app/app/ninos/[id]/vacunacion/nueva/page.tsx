import { notFound } from "next/navigation";

import { PageBackLink } from "@/components/ui/page-back-link";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { VaccinationForm } from "@/modules/vaccination/components/vaccination-form";
import { listChildVaccinationStatuses } from "@/modules/vaccination/services/vaccination-service";

export default async function NewVaccinationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireApplicationUser();
  const result = await listChildVaccinationStatuses(user, (await params).id);
  if (
    !can(user, "vaccination:create", {
      healthCenterId: result.child.community.healthCenterId,
    })
  ) {
    notFound();
  }
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <PageBackLink
        href={`/app/ninos/${result.child.id}/vacunacion`}
        label="Volver a vacunación"
      />
      <header>
        <p className="text-sm font-medium text-primary">Vacunación</p>
        <h1 className="text-3xl font-semibold">Registrar vacuna</h1>
        <p className="mt-2 text-muted-foreground">
          Registra una aplicación factual para {result.child.fullName}.
        </p>
      </header>
      <VaccinationForm
        childId={result.child.id}
        currentDate={result.evaluationDate}
        doses={result.doses.filter((dose) => dose.status !== "APPLIED")}
      />
    </section>
  );
}
