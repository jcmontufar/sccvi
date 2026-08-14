import { requireApplicationUser } from "@/modules/auth/session";

const roleLabels = {
  ADMIN: "Administración",
  HEALTH_STAFF: "Personal de salud",
  CENTER_MANAGER: "Gestión del centro",
  GUARDIAN: "Responsable",
} as const;

export default async function ApplicationHomePage() {
  const user = await requireApplicationUser();

  return (
    <section className="space-y-4">
      <p className="text-sm font-medium text-primary">Área protegida</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Bienvenido, {user.fullName}
      </h1>
      <p className="text-muted-foreground">
        Perfil: {roleLabels[user.role]}. Selecciona una opción del menú para
        continuar.
      </p>
    </section>
  );
}
