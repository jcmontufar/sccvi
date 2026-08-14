import { redirect } from "next/navigation";

import { LoginForm } from "@/modules/auth/components/login-form";
import { resolveAuthenticatedProfile } from "@/modules/auth/session";

export default async function LoginPage() {
  const profile = await resolveAuthenticatedProfile();
  if (profile.status === "active") redirect("/app");

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-5">
      <section className="w-full max-w-md space-y-7 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <header className="space-y-2">
          <p className="text-sm font-semibold text-primary">SCCVI</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Iniciar sesión
          </h1>
          <p className="text-sm text-muted-foreground">
            Ingresa con tu cuenta autorizada para acceder al sistema.
          </p>
        </header>
        <LoginForm />
      </section>
    </main>
  );
}
