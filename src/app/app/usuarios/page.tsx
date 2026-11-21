import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { listUsers } from "@/modules/users/services/user-service";

const roleLabels = {
  ADMIN: "Administrador",
  HEALTH_STAFF: "Personal de salud",
  CENTER_MANAGER: "Responsable de centro",
  GUARDIAN: "Tutor",
};

type SearchParams = {
  search?: string;
  status?: string;
  page?: string;
  creado?: string;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireApplicationUser();
  if (!can(actor, "user:list")) notFound();
  const query = await searchParams;
  const result = await listUsers(actor, {
    search: query.search,
    status: query.status,
    page: Number(query.page) || 1,
  });
  const pageUrl = (page: number) =>
    `/app/usuarios?${new URLSearchParams({ search: query.search ?? "", status: query.status ?? "active", page: String(page) })}`;
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Usuarios</h1>
          <p className="mt-2 text-muted-foreground">
            Administra las cuentas y los roles de acceso a SCCVI.
          </p>
        </div>
        <Button render={<Link href="/app/usuarios/nuevo" />}>
          Crear usuario
        </Button>
      </header>
      {query.creado ? (
        <p className="rounded-lg bg-primary/10 p-3 text-sm">
          Se creó el perfil y se solicitó el envío de la invitación.
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
            placeholder="Nombre o correo"
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
        <Button className="sm:self-end" type="submit">
          Aplicar filtros
        </Button>
      </form>
      {result.items.length ? (
        <DataTableShell>
          <table className="w-full min-w-2xl text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="p-4">Usuario</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Centro</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Acción</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((user) => (
                <tr className="border-b last:border-0" key={user.id}>
                  <td className="p-4">
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="p-4">{roleLabels[user.role]}</td>
                  <td className="p-4">{user.healthCenter?.name ?? "Global"}</td>
                  <td className="p-4">
                    {user.isActive ? "Activo" : "Inactivo"}
                  </td>
                  <td className="p-4">
                    <Button
                      render={<Link href={`/app/usuarios/${user.id}`} />}
                      variant="outline"
                    >
                      Ver y editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      ) : (
        <p className="rounded-xl border p-6 text-muted-foreground">
          No se encontraron usuarios con estos filtros.
        </p>
      )}
      {result.pages > 1 ? (
        <nav
          aria-label="Páginas de usuarios"
          className="flex items-center gap-3 text-sm"
        >
          {result.page > 1 ? (
            <Link href={pageUrl(result.page - 1)}>Anterior</Link>
          ) : null}
          <span>
            Página {result.page} de {result.pages}
          </span>
          {result.page < result.pages ? (
            <Link href={pageUrl(result.page + 1)}>Siguiente</Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
