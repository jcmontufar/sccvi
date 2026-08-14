import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { ReportRow } from "@/modules/reports/services/report-service";

export async function createPdfReport(title: string, rows: ReportRow[]) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  let page = document.addPage([792, 612]);
  let y = 575;
  const newPage = () => {
    page = document.addPage([792, 612]);
    y = 575;
  };
  page.drawText(title, { x: 36, y, size: 18, font, color: rgb(0.1, 0.1, 0.1) });
  y -= 30;
  const headings = "Fecha | Centro | Comunidad | Registro | Detalle";
  page.drawText(headings, { x: 36, y, size: 9, font });
  y -= 18;
  for (const row of rows) {
    if (y < 36) {
      newPage();
      page.drawText(headings, { x: 36, y, size: 9, font });
      y -= 18;
    }
    const line = `${row.fecha} | ${row.centro} | ${row.comunidad} | ${row.registro} | ${row.detalle}`;
    page.drawText(line.slice(0, 135), { x: 36, y, size: 8, font });
    y -= 14;
  }
  return document.save();
}

export async function createExcelReport(title: string, rows: ReportRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SCCVI";
  const worksheet = workbook.addWorksheet("Reporte");
  worksheet.columns = [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Centro de salud", key: "centro", width: 28 },
    { header: "Comunidad", key: "comunidad", width: 24 },
    { header: "Registro", key: "registro", width: 28 },
    { header: "Detalle", key: "detalle", width: 50 },
  ];
  worksheet.addRows(rows);
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = "A1:E1";
  worksheet.headerFooter.oddHeader = `&C${title}`;
  return workbook.xlsx.writeBuffer();
}
