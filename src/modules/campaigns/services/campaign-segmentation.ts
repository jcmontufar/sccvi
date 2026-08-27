import type { CampaignSegmentation } from "@/modules/campaigns/schemas/campaign-schema";
import { getCurrentBusinessDate } from "@/lib/date/business-date";

type DoseStatus = {
  doseCode: string;
  status: "APPLIED" | "PENDING" | "OVERDUE";
};

function dateAtYearOffset(date: string, years: number) {
  const [year, month, day] = date.split("-").map(Number);
  const targetYear = year + years;
  const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, month - 1, Math.min(day, lastDay)));
}

export function buildAgeDateRange(
  segmentation: CampaignSegmentation,
  currentInstant = new Date(),
) {
  const businessDate = getCurrentBusinessDate({ currentInstant });
  const start =
    segmentation.maximumAgeYears === undefined
      ? undefined
      : new Date(
          dateAtYearOffset(
            businessDate,
            -segmentation.maximumAgeYears - 1,
          ).getTime() + 86_400_000,
        );
  const end =
    segmentation.minimumAgeYears === undefined
      ? undefined
      : dateAtYearOffset(businessDate, -segmentation.minimumAgeYears);
  return { gte: start, lte: end };
}

export function matchesVaccinationSegmentation(
  segmentation: CampaignSegmentation,
  versionCode: string,
  doses: readonly DoseStatus[],
) {
  if (
    !segmentation.scheduleVersionCode ||
    !segmentation.doseCode ||
    !segmentation.doseStatus
  ) {
    return true;
  }
  return (
    segmentation.scheduleVersionCode === versionCode &&
    doses.some(
      (dose) =>
        dose.doseCode === segmentation.doseCode &&
        dose.status === segmentation.doseStatus,
    )
  );
}

export function deduplicateGuardianIds(ids: readonly string[]) {
  return [...new Set(ids)];
}
