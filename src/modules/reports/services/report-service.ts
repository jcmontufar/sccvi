import "server-only";

import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { reportFilterSchema } from "@/modules/reports/schemas/report-schema";
import {
  listActiveVaccinationScheduleDoses,
  listAuthorizedChildrenVaccinationStatuses,
} from "@/modules/vaccination/services/vaccination-service";
import { calculateExactAge } from "@/modules/growth/utils/exact-age";
import {
  calculateDoseCoverage,
  growthAgeBand,
  isIncompleteVaccinationDose,
  matchesWeightPercentileReport,
} from "@/modules/reports/services/report-rules";

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

export async function getReport(
  user: ApplicationUser,
  input: unknown,
  currentInstant = new Date(),
) {
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
    const children = await listAuthorizedChildrenVaccinationStatuses(
      user,
      currentInstant,
    );
    const rows: ReportRow[] = [];
    for (const result of children) {
      for (const dose of result.doses.filter((item) =>
        isIncompleteVaccinationDose(item, result.evaluationDate),
      )) {
        rows.push({
          fecha: dose.scheduledDate,
          centro: result.child.community.healthCenter.name,
          comunidad: result.child.community.name,
          registro: result.child.fullName,
          detalle: `${dose.vaccineName} · ${dose.doseName} · ${dose.status === "OVERDUE" ? "Atrasada" : "Pendiente desde su fecha programada"}`,
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

  if (filters.type === "low-weight" || filters.type === "overweight") {
    const percentileReportType = filters.type;
    const records = await getPrisma().growthRecord.findMany({
      where: {
        child: { isActive: true, community: { healthCenterId: centerId } },
      },
      include: {
        assessments: {
          where: { indicator: "WEIGHT_FOR_AGE" },
          orderBy: { calculatedAt: "desc" },
          take: 1,
        },
        child: {
          include: {
            community: {
              include: { healthCenter: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: [{ measurementDate: "desc" }, { createdAt: "desc" }],
      take: 5000,
    });
    const rows = records.flatMap((record): ReportRow[] => {
      const measurementDate = record.measurementDate.toISOString().slice(0, 10);
      if (
        (filters.from && measurementDate < filters.from) ||
        (filters.to && measurementDate > filters.to)
      )
        return [];
      const assessment = record.assessments[0];
      if (!assessment?.percentile) return [];
      const percentile = Number(assessment.percentile.toString());
      if (!matchesWeightPercentileReport(percentile, percentileReportType))
        return [];
      const age = calculateExactAge(
        record.child.dateOfBirth.toISOString().slice(0, 10),
        record.measurementDate.toISOString().slice(0, 10),
      );
      return [
        {
          fecha: measurementDate,
          centro: record.child.community.healthCenter.name,
          comunidad: record.child.community.name,
          registro: record.child.fullName,
          detalle: `${age.years * 12 + age.months} meses · ${record.weightKg.toString()} kg · ${record.heightCm.toString()} cm · percentil ${percentile.toFixed(3)} · Requiere seguimiento`,
        },
      ];
    });
    return {
      title:
        filters.type === "low-weight"
          ? "Niños con percentil de peso bajo"
          : "Niños con percentil de peso alto",
      rows,
    };
  }

  if (filters.type === "vaccination-coverage") {
    const schedule = await listActiveVaccinationScheduleDoses(
      user,
      currentInstant,
    );
    if (!filters.doseCode) {
      return {
        title: "Cobertura de vacunación por comunidad",
        notice:
          "Selecciona una dosis del esquema vigente para calcular la cobertura.",
        rows: [],
      };
    }
    const selectedDose = schedule.doses.find(
      (dose) => dose.doseCode === filters.doseCode,
    );
    if (!selectedDose) {
      return {
        title: "Cobertura de vacunación por comunidad",
        notice:
          "La dosis seleccionada no pertenece al esquema de vacunación vigente.",
        rows: [],
      };
    }
    const children = await listAuthorizedChildrenVaccinationStatuses(
      user,
      currentInstant,
    );
    const grouped = new Map<string, typeof children>();
    for (const child of children) {
      const key = `${child.child.community.healthCenter.name}\u0000${child.child.community.name}`;
      const group = grouped.get(key) ?? [];
      group.push(child);
      grouped.set(key, group);
    }
    const rows = [...grouped.entries()].map(([key, group]): ReportRow => {
      const [center, community] = key.split("\u0000");
      const evaluationDate = group[0]?.evaluationDate ?? "";
      const coverage = calculateDoseCoverage(
        group,
        filters.doseCode,
        evaluationDate,
      );
      return {
        fecha: evaluationDate,
        centro: center,
        comunidad: community,
        registro: selectedDose.label,
        detalle: `${coverage.numerator}/${coverage.denominator} · ${coverage.percentage === null ? "N/A" : `${coverage.percentage.toFixed(1)} %`}`,
      };
    });
    return {
      title: `Cobertura por comunidad — ${selectedDose.label}`,
      rows,
    };
  }

  if (filters.type === "average-growth") {
    const records = await getPrisma().growthRecord.findMany({
      where: {
        measurementDate: range,
        child: { isActive: true, community: { healthCenterId: centerId } },
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
      take: 5000,
    });
    type GrowthGroup = {
      center: string;
      community: string;
      band: string;
      children: Set<string>;
      count: number;
      weight: number;
      height: number;
    };
    const groups = new Map<string, GrowthGroup>();
    for (const record of records) {
      const age = calculateExactAge(
        record.child.dateOfBirth.toISOString().slice(0, 10),
        record.measurementDate.toISOString().slice(0, 10),
      );
      const band = growthAgeBand(age.years * 12 + age.months);
      const center = record.child.community.healthCenter.name;
      const community = record.child.community.name;
      const key = `${center}\u0000${community}\u0000${band}`;
      const group = groups.get(key) ?? {
        center,
        community,
        band,
        children: new Set<string>(),
        count: 0,
        weight: 0,
        height: 0,
      };
      group.children.add(record.childId);
      group.count += 1;
      group.weight += Number(record.weightKg.toString());
      group.height += Number(record.heightCm.toString());
      groups.set(key, group);
    }
    return {
      title: "Promedio de crecimiento por comunidad y grupo de edad",
      rows: [...groups.values()].map((group): ReportRow => ({
        fecha: filters.to || filters.from || "—",
        centro: group.center,
        comunidad: group.community,
        registro: group.band,
        detalle: `${group.children.size} niños · ${group.count} mediciones · peso promedio ${(group.weight / group.count).toFixed(2)} kg · talla promedio ${(group.height / group.count).toFixed(2)} cm`,
      })),
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
