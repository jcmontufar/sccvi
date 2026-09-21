import { redirect } from "next/navigation";

import { SccviLogo } from "@/components/branding/sccvi-logo";
import { LoginForm } from "@/modules/auth/components/login-form";
import { resolveAuthenticatedProfile } from "@/modules/auth/session";

export default async function LoginPage() {
  const profile = await resolveAuthenticatedProfile();
  if (profile.status === "active") redirect("/app");

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-primary p-4 sm:p-6">
      <div
        aria-hidden="true"
        className="absolute -top-32 -right-24 size-96 rounded-full bg-secondary/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-24 size-96 rounded-full bg-success/20 blur-3xl"
      />
      <section className="relative w-full max-w-md space-y-7 rounded-3xl border border-white/20 bg-card p-6 shadow-2xl sm:p-9">
        <header className="space-y-2">
          <SccviLogo />
          <h1 className="pt-4 text-2xl font-bold tracking-tight sm:text-3xl">
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
