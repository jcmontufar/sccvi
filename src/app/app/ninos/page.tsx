import Link from "next/link";

import { Button } from "@/components/ui/button";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { ChildStatusButton } from "@/modules/children/components/child-status-button";
import { listChildren } from "@/modules/children/services/child-service";
import { communityService } from "@/modules/communities/queries/prisma-community-repository";

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    communityId?: string;
  }>;
}) {
  const user = await requireApplicationUser();
  const query = await searchParams;
  const children = await listChildren(user, {
    search: query.search ?? "",
    status: query.status ?? "active",
    communityId: query.communityId ?? "",
  });
  const communities =
    user.role === "GUARDIAN"
      ? []
      : await communityService.list(user, {
          search: "",
          status: "active",
          healthCenterId: "",
        });
  const canCreate = can(user, "child:create", {
    healthCenterId: user.healthCenterId,
  });
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Niños</h1>
          <p className="mt-2 text-muted-foreground">
            Consulta los perfiles infantiles autorizados.
          </p>
        </div>
        {canCreate || user.role === "ADMIN" ? (
          <Button render={<Link href="/app/ninos/nuevo" />}>
            Registrar niño
          </Button>
        ) : null}
      </header>
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
        <label className="text-sm font-medium">
          Buscar
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={query.search}
            name="search"
            placeholder="Nombre del niño"
          />
        </label>
        <label className="text-sm font-medium">
          Estado
          <select
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            defaultValue={query.status ?? "active"}
            name="status"
          >
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="all">Todos</option>
          </select>
        </label>
        {user.role !== "GUARDIAN" ? (
          <label className="text-sm font-medium">
            Comunidad
            <select
              className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-normal"
              defaultValue={query.communityId ?? ""}
              name="communityId"
            >
              <option value="">Todas</option>
              {communities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button className="sm:w-fit" type="submit">
          Aplicar filtros
        </Button>
      </form>
      {children.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {children.map((child) => (
            <article
              className="space-y-3 rounded-xl border bg-card p-5"
              key={child.id}
            >
              <div className="flex justify-between gap-4">
                <h2 className="font-semibold">{child.fullName}</h2>
                <span className="text-sm text-muted-foreground">
                  {child.isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {child.community.name}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  render={<Link href={`/app/ninos/${child.id}`} />}
                  variant="outline"
                >
                  Ver perfil
                </Button>
                {can(user, "child:deactivate", {
                  healthCenterId: child.community.healthCenterId,
                }) ? (
                  <ChildStatusButton id={child.id} isActive={child.isActive} />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border p-6 text-muted-foreground">
          No se encontraron niños con los filtros seleccionados.
        </p>
      )}
    </section>
  );
}
