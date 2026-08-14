import { VaccineForm } from "@/modules/vaccination/components/vaccine-form";

export default function NewVaccinePage() {
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Nueva vacuna</h1>
        <p className="mt-2 text-muted-foreground">
          Registra únicamente información del catálogo.
        </p>
      </div>
      <VaccineForm />
    </section>
  );
}
