import {
  getSafeErrorMessage,
  getSafeHttpStatus,
} from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import { createExcelReport } from "@/modules/reports/services/report-export";
import { getReport } from "@/modules/reports/services/report-service";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const type = query.get("type") ?? "communities";
    const report = await getReport(await requireApplicationUser(), {
      type,
      from: query.get("from") ?? "",
      to: query.get("to") ?? "",
    });
    const body = await createExcelReport(report.title, report.rows);
    return new Response(Buffer.from(body), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="sccvi-${type}-report.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: { code: "REPORT_ERROR", message: getSafeErrorMessage(error) },
      },
      { status: getSafeHttpStatus(error) },
    );
  }
}
