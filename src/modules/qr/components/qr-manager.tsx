"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  generateCredentialAction,
  revokeCredentialAction,
  type QRFormState,
} from "@/modules/qr/actions/qr-actions";

export function QRManager({
  childId,
  credentials,
}: {
  childId: string;
  credentials: {
    id: string;
    createdAt: Date;
    expiresAt: Date | null;
    revokedAt: Date | null;
    lastUsedAt: Date | null;
    pinHash: string | null;
  }[];
}) {
  const [state, action, pending] = useActionState<QRFormState, FormData>(
    generateCredentialAction.bind(null, childId),
    {},
  );
  const [qrImage, setQrImage] = useState<string>();
  const [revokeError, setRevokeError] = useState<string>();
  const [transitioning, startTransition] = useTransition();
  useEffect(() => {
    if (state.rawToken) {
      const url = `${window.location.origin}/tarjeta/${state.rawToken}`;
      QRCode.toDataURL(url, { width: 320, margin: 2 }).then(setQrImage);
    }
  }, [state.rawToken]);
  return (
    <div className="space-y-6">
      <form
        action={action}
        className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2"
      >
        <label className="text-sm font-medium">
          Expiración opcional
          <input
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
            name="expiresAt"
            type="date"
          />
        </label>
        <label className="text-sm font-medium">
          PIN opcional
          <input
            autoComplete="new-password"
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
            inputMode="numeric"
            name="pin"
            pattern="[0-9]{4,12}"
            placeholder="4 a 12 dígitos"
            type="password"
          />
        </label>
        <div className="sm:col-span-2">
          <Button disabled={pending} type="submit">
            {pending ? "Generando…" : "Generar nueva credencial"}
          </Button>
        </div>
        {state.error ? (
          <p className="text-sm text-destructive sm:col-span-2">
            {state.error}
          </p>
        ) : null}
      </form>
      {state.rawToken && qrImage ? (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Credencial generada</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Guarda o imprime este QR ahora. El token original no se almacena y
            no volverá a mostrarse.
          </p>
          <Image
            alt="Código QR de acceso a la tarjeta digital"
            className="mt-4 h-64 w-64"
            height={256}
            src={qrImage}
            unoptimized
            width={256}
          />
          <Button
            className="mt-3 print:hidden"
            onClick={() => window.print()}
            type="button"
            variant="outline"
          >
            Imprimir
          </Button>
        </section>
      ) : null}
      <section>
        <h2 className="text-xl font-semibold">Credenciales</h2>
        <div className="mt-3 space-y-3">
          {credentials.map((credential) => (
            <article
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              key={credential.id}
            >
              <div className="text-sm">
                <p>
                  {credential.revokedAt
                    ? "Revocada"
                    : credential.expiresAt && credential.expiresAt <= new Date()
                      ? "Expirada"
                      : "Activa"}
                  {credential.pinHash ? " · Con PIN" : " · Sin PIN"}
                </p>
                <p className="text-muted-foreground">
                  Creada:{" "}
                  {new Date(credential.createdAt).toLocaleDateString("es-GT")}
                </p>
              </div>
              {!credential.revokedAt ? (
                <Button
                  disabled={transitioning}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await revokeCredentialAction(
                        childId,
                        credential.id,
                      );
                      setRevokeError(result.error);
                    })
                  }
                  type="button"
                  variant="outline"
                >
                  Revocar
                </Button>
              ) : null}
            </article>
          ))}
        </div>
        {revokeError ? (
          <p className="mt-3 text-sm text-destructive">{revokeError}</p>
        ) : null}
      </section>
    </div>
  );
}
