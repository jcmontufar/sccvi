import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { can } from "@/modules/auth/authorization";
import { requireApplicationUser } from "@/modules/auth/session";
import { TelegramLinkControls } from "@/modules/guardians/components/telegram-link-controls";
import { getGuardian } from "@/modules/guardians/services/guardian-service";

export default async function GuardianDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creado?: string; actualizado?: string }>;
}) {
  const user = await requireApplicationUser();
  const { id } = await params;
  const guardian = await getGuardian(user, id).catch(() => notFound());
  const query = await searchParams;
  const editable = can(user, "guardian:update", {
    healthCenterId: guardian.community.healthCenterId,
  });
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">
            Tutor o responsable
          </p>
          <h1 className="text-3xl font-semibold">{guardian.fullName}</h1>
          <p className="mt-2 text-muted-foreground">
            {guardian.community.name} — {guardian.community.healthCenter.name}
          </p>
        </div>
        {editable ? (
          <Button render={<Link href={`/app/tutores/${guardian.id}/editar`} />}>
            Editar
          </Button>
        ) : null}
      </header>
      {query.creado || query.actualizado ? (
        <p className="rounded-lg bg-primary/10 p-3 text-sm">
          La información se guardó correctamente.
        </p>
      ) : null}
      <dl className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">Identificación</dt>
          <dd>{guardian.identification || "No registrada"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Teléfono</dt>
          <dd>{guardian.phone || "No registrado"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Correo electrónico</dt>
          <dd>{guardian.email || "No registrado"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">
            Preferencia de notificación
          </dt>
          <dd>
            {guardian.preferredNotificationChannel === "EMAIL"
              ? "Correo electrónico"
              : guardian.preferredNotificationChannel === "TELEGRAM"
                ? "Telegram"
                : "Sin preferencia disponible"}
          </dd>
        </div>
      </dl>
      {editable ? (
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <div>
            <h2 className="text-xl font-semibold">Conexión de Telegram</h2>
            <p className="text-sm text-muted-foreground">
              Estado:{" "}
              {guardian.telegramConnection?.linkedAt &&
              !guardian.telegramConnection.revokedAt
                ? "Vinculado"
                : "No vinculado"}
            </p>
          </div>
          <TelegramLinkControls
            guardianId={guardian.id}
            linked={Boolean(
              guardian.telegramConnection?.linkedAt &&
              !guardian.telegramConnection.revokedAt,
            )}
          />
        </section>
      ) : null}
      <section>
        <h2 className="mb-3 text-xl font-semibold">Niños asociados</h2>
        {guardian.childGuardians.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {guardian.childGuardians.map((relationship) => (
              <Link
                className="rounded-lg border bg-card p-4 hover:bg-muted/40"
                href={`/app/ninos/${relationship.child.id}`}
                key={relationship.child.id}
              >
                <span className="font-medium">
                  {relationship.child.fullName}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {relationship.relationshipType || "Relación no especificada"}
                  {relationship.isPrimary ? " · Tutor principal" : ""}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border p-4 text-muted-foreground">
            No hay niños asociados con este tutor.
          </p>
        )}
      </section>
    </section>
  );
}
