import { describe, expect, it } from "vitest";

import {
  createExcelReport,
  createPdfReport,
} from "@/modules/reports/services/report-export";

const rows = [
  {
    fecha: "2026-08-14",
    centro: "Centro de prueba",
    comunidad: "Comunidad de prueba",
    registro: "Registro ficticio",
    detalle: "Detalle autorizado",
  },
];

describe("report exports", () => {
  it("creates a readable PDF payload", async () => {
    const report = await createPdfReport("Reporte de prueba", rows);
    expect(Buffer.from(report).subarray(0, 4).toString()).toBe("%PDF");
  });

  it("creates a real XLSX zip payload", async () => {
    const report = await createExcelReport("Reporte de prueba", rows);
    expect(Buffer.from(report).subarray(0, 2).toString()).toBe("PK");
  });
});
