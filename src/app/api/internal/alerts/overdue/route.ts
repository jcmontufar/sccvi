import { getServerEnvironment } from "@/lib/env/server-env";
import {
  isAuthorizedCronRequest,
  isCronSecretConfigured,
} from "@/modules/alerts/services/cron-auth";
import { runOverdueAlertJob } from "@/modules/alerts/services/overdue-alert-job";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { CRON_SECRET: cronSecret } = getServerEnvironment();
  if (!isCronSecretConfigured(cronSecret)) {
    return Response.json(
      { success: false, error: { code: "CRON_NOT_CONFIGURED" } },
      { status: 503 },
    );
  }
  if (
    !isAuthorizedCronRequest(request.headers.get("authorization"), cronSecret)
  ) {
    return Response.json(
      { success: false, error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  const summary = await runOverdueAlertJob();
  return Response.json(
    { success: summary.errors.length === 0, data: summary },
    { status: summary.errors.length === 0 ? 200 : 500 },
  );
}
