import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { ChildNavigation } from "@/modules/children/components/child-navigation";
import {
  childAccessResource,
  getChild,
} from "@/modules/children/services/child-service";
import { listGrowthRecords } from "@/modules/growth/services/growth-record-service";

function ageLabel(age: { years: number; months: number; days: number }) {
  return `${age.years} años, ${age.months} meses y ${age.days} días`;
}

export default async function GrowthHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ registrada?: string; corregida?: string }>;
}) {
  const user = await requireApplicationUser();
  const { id } = await params;
  const child = await getChild(user, id).catch(() => notFound());
  const records = await listGrowthRecords(user, child.id);
  const query = await searchParams;
  const canRegister = can(user, "growth:create", childAccessResource(child));
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Crecimiento</p>
          <h1 className="text-3xl font-semibold">{child.fullName}</h1>
          <p className="mt-2 text-muted-foreground">
            Historial de mediciones registradas.
          </p>
        </div>
        {canRegister ? (
          <Button
            render={<Link href={`/app/ninos/${child.id}/crecimiento/nueva`} />}
          >
            Registrar medición
          </Button>
        ) : null}
      </header>
      <ChildNavigation active="growth" childId={child.id} />
      {query.registrada || query.corregida ? (
        <p className="rounded-lg bg-primary/10 p-3 text-sm">
          La medición se guardó correctamente.
        </p>
      ) : null}
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Esta sección presenta únicamente mediciones históricas. No incluye
        evaluación, clasificación ni referencia de la OMS.
      </div>
      {records.length ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Edad en la medición</th>
                <th className="p-4">Peso</th>
                <th className="p-4">Talla</th>
                <th className="p-4">Registró</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr className="border-b last:border-0" key={record.id}>
                  <td className="p-4">
                    {record.measurementDate.toLocaleDateString("es-GT", {
                      timeZone: "UTC",
                    })}
                  </td>
                  <td className="p-4">{ageLabel(record.exactAge)}</td>
                  <td className="p-4">{record.weightKg.toString()} kg</td>
                  <td className="p-4">{record.heightCm.toString()} cm</td>
                  <td className="p-4">{record.measuredBy.fullName}</td>
                  <td className="p-4">
                    {can(user, "growth:update", childAccessResource(child)) ? (
                      <Button
                        render={
                          <Link
                            href={`/app/ninos/${child.id}/crecimiento/${record.id}/corregir`}
                          />
                        }
                        variant="outline"
                      >
                        Corregir
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">
                        Solo lectura
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border p-6 text-muted-foreground">
          Aún no hay mediciones de crecimiento registradas.
        </p>
      )}
    </section>
  );
}
