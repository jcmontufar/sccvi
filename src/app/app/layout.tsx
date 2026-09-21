import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
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
    <AppShell navigation={navigation} user={profile.user}>
      {children}
    </AppShell>
  );
}
