import Link from "next/link";

import { Button } from "@/components/ui/button";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { CommunityStatusButton } from "@/modules/communities/components/community-status-button";
import { communityService } from "@/modules/communities/queries/prisma-community-repository";
import { listHealthCenters } from "@/modules/health-centers/services/health-center-service";

type SearchParams = {
  search?: string;
  status?: string;
  healthCenterId?: string;
  creada?: string;
  actualizada?: string;
};

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireApplicationUser();
  const query = await searchParams;
  const [communities, healthCenters] = await Promise.all([
    communityService.list(user, {
      search: query.search ?? "",
      status: query.status ?? "active",
      healthCenterId: query.healthCenterId ?? "",
    }),
    listHealthCenters(user),
  ]);
  const canCreate = can(user, "community:create", {
    healthCenterId: user.healthCenterId,
  });

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Comunidades</h1>
          <p className="mt-2 text-muted-foreground">
            Busca y administra las comunidades autorizadas.
          </p>
        </div>
        {canCreate || user.role === "ADMIN" ? (
          <Button render={<Link href="/app/comunidades/nueva" />}>
            Crear comunidad
          </Button>
        ) : null}
      </header>
      {query.creada || query.actualizada ? (
        <p className="rounded-lg bg-primary/10 p-3 text-sm">
          La comunidad se guardó correctamente.
        </p>
      ) : null}
      <form
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3"
        method="get"
      >
        <label className="text-sm font-medium">
          Buscar
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={query.search}
            name="search"
            placeholder="Nombre de la comunidad"
          />
        </label>
        <label className="text-sm font-medium">
          Estado
          <select
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={query.status ?? "active"}
            name="status"
          >
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
            <option value="all">Todas</option>
          </select>
        </label>
        {user.role === "ADMIN" ? (
          <label className="text-sm font-medium">
            Centro de salud
            <select
              className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
              defaultValue={query.healthCenterId ?? ""}
              name="healthCenterId"
            >
              <option value="">Todos</option>
              {healthCenters.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button className="sm:w-fit" type="submit">
          Aplicar filtros
        </Button>
      </form>
      {communities.length ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-2xl text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="p-4">Comunidad</th>
                <th className="p-4">Centro de salud</th>
                <th className="p-4">Familias estimadas</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {communities.map((community) => {
                const manageable = can(user, "community:update", {
                  healthCenterId: community.healthCenterId,
                });
                return (
                  <tr className="border-b last:border-0" key={community.id}>
                    <td className="p-4">
                      <p className="font-medium">{community.name}</p>
                      <p className="text-muted-foreground">
                        {community.location || "Sin ubicación registrada"}
                      </p>
                    </td>
                    <td className="p-4">{community.healthCenter.name}</td>
                    <td className="p-4">
                      {community.estimatedFamilies ?? "No registrado"}
                    </td>
                    <td className="p-4">
                      {community.isActive ? "Activa" : "Inactiva"}
                    </td>
                    <td className="flex gap-2 p-4">
                      {manageable ? (
                        <>
                          <Button
                            render={
                              <Link
                                href={`/app/comunidades/${community.id}/editar`}
                              />
                            }
                            variant="outline"
                          >
                            Editar
                          </Button>
                          <CommunityStatusButton
                            id={community.id}
                            isActive={community.isActive}
                          />
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Solo lectura
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border p-6 text-muted-foreground">
          No se encontraron comunidades con los filtros seleccionados.
        </p>
      )}
    </section>
  );
}
