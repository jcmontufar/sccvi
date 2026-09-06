import { z } from "zod";

const optionalUuid = z.union([z.literal(""), z.uuid()]).default("");
const optionalAge = z.union([
  z.literal(""),
  z.coerce.number().int().min(0).max(59),
]);

export const analyticsFilterSchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    cutoffDate: z.iso.date(),
    healthCenterId: optionalUuid,
    communityId: optionalUuid,
    minAgeMonths: optionalAge.default(""),
    maxAgeMonths: optionalAge.default(""),
    sex: z.enum(["ALL", "MALE", "FEMALE"]).default("ALL"),
    doseCode: z.string().trim().max(80).default(""),
    alertType: z
      .enum(["ALL", "GROWTH", "VACCINATION", "MISSED_FOLLOW_UP"])
      .default("ALL"),
    alertSeverity: z.enum(["ALL", "PREVENTIVE", "CRITICAL"]).default("ALL"),
    alertStatus: z.enum(["ALL", "OPEN", "REVIEWED", "RESOLVED"]).default("ALL"),
    sortBy: z
      .enum([
        "children",
        "measurements",
        "overdueFollowUps",
        "overdueDoses",
        "openAlerts",
        "criticalAlerts",
        "lowPercentile",
        "highPercentile",
      ])
      .default("overdueFollowUps"),
  })
  .refine(({ from, to }) => from <= to, {
    message: "La fecha inicial no puede ser posterior a la fecha final.",
  })
  .refine(({ to, cutoffDate }) => to <= cutoffDate, {
    message: "El período no puede terminar después de la fecha de corte.",
  })
  .refine(
    ({ minAgeMonths, maxAgeMonths }) => {
      if (minAgeMonths === "" || maxAgeMonths === "") return true;
      return minAgeMonths <= maxAgeMonths;
    },
    {
      message: "La edad mínima no puede ser mayor que la edad máxima.",
    },
  );

export type AnalyticsFilters = z.infer<typeof analyticsFilterSchema>;
