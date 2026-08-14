import { requireApplicationUser } from "@/modules/auth/session";
import { getDashboardMetrics } from "@/modules/dashboard/services/dashboard-service";

const roleLabels = {
  ADMIN: "Administración",
  HEALTH_STAFF: "Personal de salud",
  CENTER_MANAGER: "Gestión del centro",
  GUARDIAN: "Responsable",
} as const;

export default async function ApplicationHomePage() {
  const user = await requireApplicationUser();
  const metrics = await getDashboardMetrics(user);
  const cards = [
    ["Niños activos", metrics.children],
    ["Comunidades activas", metrics.communities],
    ["Tutores activos", metrics.guardians],
    ["Mediciones registradas", metrics.growthRecords],
    ["Alertas abiertas", metrics.openAlerts],
  ];

  return (
    <section className="space-y-6">
      <p className="text-sm font-medium text-primary">Área protegida</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Bienvenido, {user.fullName}
      </h1>
      <p className="text-muted-foreground">
        Perfil: {roleLabels[user.role]}. Selecciona una opción del menú para
        continuar.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards
          .filter(
            ([label]) =>
              user.role !== "GUARDIAN" ||
              !["Comunidades activas", "Tutores activos"].includes(
                String(label),
              ),
          )
          .map(([label, value]) => (
            <article className="rounded-xl border bg-card p-5" key={label}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </article>
          ))}
      </div>
      <p className="rounded-xl border p-4 text-sm text-muted-foreground">
        Las métricas de cobertura, dosis pendientes y cumplimiento de vacunación
        se omiten hasta contar con un calendario oficial aprobado.
      </p>
    </section>
  );
}
