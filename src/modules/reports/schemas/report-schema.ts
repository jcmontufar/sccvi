import { z } from "zod";

export const reportFilterSchema = z
  .object({
    type: z.enum([
      "communities",
      "growth",
      "vaccinations",
      "incomplete-vaccination",
      "low-weight",
      "overweight",
      "vaccination-coverage",
      "average-growth",
      "alerts",
    ]),
    from: z.union([z.literal(""), z.iso.date()]).default(""),
    to: z.union([z.literal(""), z.iso.date()]).default(""),
    doseCode: z.string().trim().max(80).default(""),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    message: "La fecha inicial no puede ser posterior a la fecha final.",
  })
  .refine(({ type, doseCode }) => type !== "vaccination-coverage" || doseCode, {
    message: "Selecciona una dosis para calcular la cobertura.",
    path: ["doseCode"],
  });

export type ReportType = z.infer<typeof reportFilterSchema>["type"];
