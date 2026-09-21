import { PageBackLink } from "@/components/ui/page-back-link";
import { requireApplicationUser } from "@/modules/auth/session";
import { ChildNavigation } from "@/modules/children/components/child-navigation";
import { QRManager } from "@/modules/qr/components/qr-manager";
import { listChildCredentials } from "@/modules/qr/services/qr-service";

export default async function ChildDigitalCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const credentials = await listChildCredentials(
    await requireApplicationUser(),
    id,
  );
  return (
    <section className="space-y-6">
      <PageBackLink href={`/app/ninos/${id}`} label="Volver al perfil" />
      <ChildNavigation active="card" canManageDigitalCard childId={id} />
      <header>
        <h1 className="text-3xl font-semibold">Tarjeta digital y QR</h1>
        <p className="mt-2 text-muted-foreground">
          Genera credenciales opacas, revocables y con PIN opcional.
        </p>
      </header>
      <QRManager childId={id} credentials={credentials} />
    </section>
  );
}
