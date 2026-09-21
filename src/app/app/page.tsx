import { requireApplicationUser } from "@/modules/auth/session";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        description={`Perfil: ${roleLabels[user.role]}. Consulta el estado actual y prioriza los próximos seguimientos.`}
        eyebrow="Resumen operativo"
        title={`Bienvenido, ${user.fullName}`}
      />
      <DashboardOverview metrics={metrics} role={user.role} />
    </section>
  );
}
