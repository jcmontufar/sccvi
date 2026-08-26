import { z } from "zod";

export const reportFilterSchema = z
  .object({
    type: z.enum([
      "communities",
      "growth",
      "vaccinations",
      "incomplete-vaccination",
      "alerts",
    ]),
    from: z.union([z.literal(""), z.iso.date()]).default(""),
    to: z.union([z.literal(""), z.iso.date()]).default(""),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    message: "La fecha inicial no puede ser posterior a la fecha final.",
  });

export type ReportType = z.infer<typeof reportFilterSchema>["type"];
