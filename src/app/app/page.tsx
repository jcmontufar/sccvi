import { requireApplicationUser } from "@/modules/auth/session";
import { DashboardOverview } from "@/modules/dashboard/components/dashboard-overview";
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
  return (
    <section className="space-y-7">
      <header className="space-y-2">
        <p className="text-sm font-medium text-sky-700">Resumen operativo</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Bienvenido, {user.fullName}
        </h1>
        <p className="text-muted-foreground">
          Perfil: {roleLabels[user.role]}. Consulta el estado actual y prioriza
          los próximos seguimientos.
        </p>
      </header>
      <DashboardOverview metrics={metrics} role={user.role} />
    </section>
  );
}
