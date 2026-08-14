import { z } from "zod";

export const alertIdSchema = z.uuid("La alerta no es válida.");

export const alertInputSchema = z.object({
  childId: z.uuid("Selecciona un niño válido."),
  type: z.enum(["GROWTH", "VACCINATION", "MISSED_FOLLOW_UP"]),
  severity: z.enum(["PREVENTIVE", "CRITICAL"]),
  title: z.string().trim().min(3).max(160),
  message: z.string().trim().min(3).max(2000),
  sourceType: z.string().trim().max(80).nullable().optional(),
  sourceId: z.string().trim().max(160).nullable().optional(),
});

export const alertSearchSchema = z.object({
  status: z.enum(["OPEN", "REVIEWED", "RESOLVED", "ALL"]).default("OPEN"),
  severity: z.enum(["PREVENTIVE", "CRITICAL", "ALL"]).default("ALL"),
});
