import { SccviLogo } from "@/components/branding/sccvi-logo";
import { AcceptInvitationForm } from "@/modules/auth/components/accept-invitation-form";

export default function AcceptInvitationPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-primary p-4">
      <section className="w-full max-w-md space-y-6 rounded-3xl bg-card p-6 shadow-xl sm:p-9">
        <SccviLogo />
        <div>
          <h1 className="text-2xl font-semibold">Activar cuenta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Establece una contraseña para tu cuenta invitada de SCCVI.
          </p>
        </div>
        <AcceptInvitationForm />
      </section>
    </main>
  );
}
