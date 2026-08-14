import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/modules/auth/actions";
import { getNavigation } from "@/modules/auth/navigation";
import { resolveAuthenticatedProfile } from "@/modules/auth/session";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await resolveAuthenticatedProfile();
  if (profile.status === "unauthenticated") redirect("/iniciar-sesion");

  if (profile.status !== "active") {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <section className="max-w-lg space-y-4 rounded-xl border p-6 text-center">
          <h1 className="text-xl font-semibold">Acceso no disponible</h1>
          <p className="text-muted-foreground">
            {profile.status === "inactive"
              ? "Tu perfil de SCCVI está inactivo. Comunícate con la administración."
              : "Tu cuenta autenticada no tiene un perfil de SCCVI. Comunícate con la administración."}
          </p>
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              Cerrar sesión
            </Button>
          </form>
        </section>
      </main>
    );
  }

  const navigation = getNavigation(profile.user.role);

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link className="mr-auto font-semibold" href="/app">
            SCCVI
          </Link>
          <nav
            aria-label="Navegación principal"
            className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto"
          >
            {navigation.map((item) => (
              <Button
                key={item.href}
                render={<Link href={item.href} />}
                variant="ghost"
              >
                {item.label}
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:inline">
              {profile.user.fullName}
            </span>
            <form action={logoutAction}>
              <Button type="submit" variant="outline">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
