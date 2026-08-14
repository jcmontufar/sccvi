import type { CampaignSegmentation } from "@/modules/campaigns/schemas/campaign-schema";

export function buildAgeDateRange(
  segmentation: CampaignSegmentation,
  currentDate = new Date(),
) {
  const start =
    segmentation.maximumAgeYears === undefined
      ? undefined
      : new Date(
          Date.UTC(
            currentDate.getUTCFullYear() - segmentation.maximumAgeYears - 1,
            currentDate.getUTCMonth(),
            currentDate.getUTCDate() + 1,
          ),
        );
  const end =
    segmentation.minimumAgeYears === undefined
      ? undefined
      : new Date(
          Date.UTC(
            currentDate.getUTCFullYear() - segmentation.minimumAgeYears,
            currentDate.getUTCMonth(),
            currentDate.getUTCDate(),
          ),
        );
  return { gte: start, lte: end };
}
