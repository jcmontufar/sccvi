import {
  ApplicationError,
  getSafeErrorMessage,
} from "@/lib/errors/application-error";
import { DigitalCardAccess } from "@/modules/qr/components/digital-card-access";
import { accessDigitalCard } from "@/modules/qr/services/qr-service";

export default async function PublicDigitalCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let initialChild: Awaited<ReturnType<typeof accessDigitalCard>> | undefined;
  let initialError: string | undefined;
  let pinRequired = false;
  try {
    const child = await accessDigitalCard(token);
    initialChild = child;
  } catch (error) {
    pinRequired =
      error instanceof ApplicationError && error.code === "QR_PIN_REQUIRED";
    initialError = getSafeErrorMessage(error);
  }
  return (
    <main className="mx-auto min-h-svh max-w-xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-semibold">Tarjeta digital SCCVI</h1>
        <p className="mt-2 text-muted-foreground">
          Acceso mediante credencial segura.
        </p>
      </header>
      <DigitalCardAccess
        initialChild={initialChild}
        initialError={initialError}
        pinRequired={pinRequired}
        rawToken={token}
      />
    </main>
  );
}
