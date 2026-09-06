import { getCurrentBusinessDate } from "@/lib/date/business-date";
import { AnalyticsDashboard } from "@/modules/analytics/components/analytics-dashboard";
import { getAnalytics } from "@/modules/analytics/services/analytics-service";
import { requireApplicationUser } from "@/modules/auth/session";

function monthsBefore(date: string, months: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() - months);
  return value.toISOString().slice(0, 10);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireApplicationUser();
  const query = await searchParams;
  const today = getCurrentBusinessDate();
  const value = (name: string, fallback = "") => {
    const item = query[name];
    return typeof item === "string" ? item : fallback;
  };
  const filters = {
    from: value("from", monthsBefore(today, 5).slice(0, 7) + "-01"),
    to: value("to", today),
    cutoffDate: value("cutoffDate", today),
    healthCenterId: value("healthCenterId"),
    communityId: value("communityId"),
    minAgeMonths: value("minAgeMonths"),
    maxAgeMonths: value("maxAgeMonths"),
    sex: value("sex", "ALL"),
    doseCode: value("doseCode"),
    alertType: value("alertType", "ALL"),
    alertSeverity: value("alertSeverity", "ALL"),
    alertStatus: value("alertStatus", "ALL"),
    sortBy: value("sortBy", "overdueFollowUps"),
  };
  const result = await getAnalytics(user, filters);

  return (
    <section className="space-y-7">
      <header>
        <p className="text-sm font-medium text-sky-700">Apoyo operativo</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Dashboard analítico
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Analiza actividad, seguimiento, vacunación, crecimiento y territorio
          con información autorizada y criterios metodológicos explícitos.
        </p>
      </header>
      <AnalyticsDashboard result={result} role={user.role} />
    </section>
  );
}
