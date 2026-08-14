import { requireApplicationUser } from "@/modules/auth/session";
import { VaccineForm } from "@/modules/vaccination/components/vaccine-form";
import { getVaccine } from "@/modules/vaccination/services/vaccine-service";

export default async function EditVaccinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vaccine = await getVaccine(await requireApplicationUser(), id);
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold">Editar vacuna</h1>
      <VaccineForm vaccine={vaccine} />
    </section>
  );
}
