import "server-only";

import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { reportFilterSchema } from "@/modules/reports/schemas/report-schema";
import { listChildVaccinationStatuses } from "@/modules/vaccination/services/vaccination-service";

export type ReportRow = {
  fecha: string;
  centro: string;
  comunidad: string;
  registro: string;
  detalle: string;
};

const alertSeverityLabels = {
  PREVENTIVE: "Preventiva",
  CRITICAL: "Crítica",
} as const;
const alertStatusLabels = {
  OPEN: "Abierta",
  REVIEWED: "Revisada",
  RESOLVED: "Resuelta",
} as const;

function dateRange(from: string, to: string) {
  return {
    gte: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
    lte: to ? new Date(`${to}T23:59:59.999Z`) : undefined,
  };
}

export async function getReport(user: ApplicationUser, input: unknown) {
  authorize(user, "report:read", { healthCenterId: user.healthCenterId });
  const filters = reportFilterSchema.parse(input);
  const centerId =
    user.role === "ADMIN" ? undefined : (user.healthCenterId ?? "");
  const range = dateRange(filters.from, filters.to);

  if (filters.type === "communities") {
    const records = await getPrisma().community.findMany({
      where: { healthCenterId: centerId, createdAt: range },
      include: {
        healthCenter: { select: { name: true } },
        _count: { select: { children: true, guardians: true } },
      },
      orderBy: { name: "asc" },
    });
    return {
      title: "Reporte de comunidades",
      rows: records.map((record): ReportRow => ({
        fecha: record.createdAt.toISOString().slice(0, 10),
        centro: record.healthCenter.name,
        comunidad: record.name,
        registro: record.isActive ? "Activa" : "Inactiva",
        detalle: `${record._count.children} niños · ${record._count.guardians} tutores`,
      })),
    };
  }

  if (filters.type === "growth") {
    const records = await getPrisma().growthRecord.findMany({
      where: {
        measurementDate: range,
        child: { community: { healthCenterId: centerId } },
      },
      include: {
        child: {
          include: {
            community: {
              include: { healthCenter: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { measurementDate: "desc" },
      take: 1000,
    });
    return {
      title: "Reporte de crecimiento",
      rows: records.map((record): ReportRow => ({
        fecha: record.measurementDate.toISOString().slice(0, 10),
        centro: record.child.community.healthCenter.name,
        comunidad: record.child.community.name,
        registro: record.child.fullName,
        detalle: `${record.weightKg.toString()} kg · ${record.heightCm.toString()} cm`,
      })),
    };
  }

  if (filters.type === "vaccinations") {
    const records = await getPrisma().vaccination.findMany({
      where: {
        applicationDate: range,
        child: { community: { healthCenterId: centerId } },
      },
      include: {
        vaccineSchedule: { include: { vaccine: true, version: true } },
        child: {
          include: {
            community: {
              include: { healthCenter: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { applicationDate: "desc" },
      take: 1000,
    });
    return {
      title: "Reporte de vacunas aplicadas",
      rows: records.map((record): ReportRow => ({
        fecha: record.applicationDate.toISOString().slice(0, 10),
        centro: record.child.community.healthCenter.name,
        comunidad: record.child.community.name,
        registro: record.child.fullName,
        detalle: `${record.vaccineSchedule.vaccine.name} · ${record.vaccineSchedule.doseName ?? `Dosis ${record.vaccineSchedule.doseNumber}`} · ${record.vaccineSchedule.version?.code ?? record.vaccineSchedule.scheduleVersion}`,
      })),
    };
  }

  if (filters.type === "incomplete-vaccination") {
    const children = await getPrisma().child.findMany({
      where: { isActive: true, community: { healthCenterId: centerId } },
      select: { id: true },
      take: 1000,
    });
    const rows: ReportRow[] = [];
    for (const child of children) {
      const result = await listChildVaccinationStatuses(user, child.id);
      for (const dose of result.doses.filter(
        (item) => item.status === "OVERDUE",
      )) {
        rows.push({
          fecha: dose.scheduledDate,
          centro: result.child.community.healthCenter.name,
          comunidad: result.child.community.name,
          registro: result.child.fullName,
          detalle: `${dose.vaccineName} · ${dose.doseName} · Atrasada`,
        });
      }
    }
    return {
      title: "Reporte de dosis atrasadas",
      rows: rows
        .filter(
          (row) =>
            (!filters.from || row.fecha >= filters.from) &&
            (!filters.to || row.fecha <= filters.to),
        )
        .sort((left, right) => left.fecha.localeCompare(right.fecha)),
    };
  }

  const records = await getPrisma().alert.findMany({
    where: {
      createdAt: range,
      child: { community: { healthCenterId: centerId } },
    },
    include: {
      child: {
        include: {
          community: { include: { healthCenter: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  return {
    title: "Reporte de alertas",
    rows: records.map((record): ReportRow => ({
      fecha: record.createdAt.toISOString().slice(0, 10),
      centro: record.child.community.healthCenter.name,
      comunidad: record.child.community.name,
      registro: record.child.fullName,
      detalle: `${record.title} · ${alertSeverityLabels[record.severity]} · ${alertStatusLabels[record.status]}`,
    })),
  };
}
