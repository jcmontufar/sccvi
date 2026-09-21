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
import type { ReportAnalytics } from "@/modules/reports/types/report-analytics";

export type ReportRow = {
  fecha: string;
  centro: string;
  comunidad: string;
  registro: string;
  detalle: string;
};

export type ReportResult = {
  title: string;
  rows: ReportRow[];
  notice?: string;
  analytics: ReportAnalytics;
};

function analytics(
  metrics: ReportAnalytics["metrics"],
  charts: ReportAnalytics["charts"],
  emptyTitle: string,
  emptyDescription: string,
): ReportAnalytics {
  return { metrics, charts, emptyTitle, emptyDescription };
}

function countBy<T>(items: readonly T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, value]) => ({ label, value }));
}

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
): Promise<ReportResult> {
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
      analytics: analytics(
        [
          {
            label: "Comunidades",
            value: records.length,
            description: "En el resultado generado",
          },
          {
            label: "Activas",
            value: records.filter((record) => record.isActive).length,
            description: "En el resultado generado",
          },
          {
            label: "Niños registrados",
            value: records.reduce(
              (total, record) => total + record._count.children,
              0,
            ),
            description: "Suma del resultado generado",
          },
          {
            label: "Tutores registrados",
            value: records.reduce(
              (total, record) => total + record._count.guardians,
              0,
            ),
            description: "Suma del resultado generado",
          },
        ],
        [
          {
            title: "Población registrada por comunidad",
            description: "Niños y tutores incluidos en el resultado generado.",
            data: records.map((record) => ({
              label: record.name,
              children: record._count.children,
              guardians: record._count.guardians,
            })),
            series: [
              {
                key: "children",
                label: "Niños",
              },
              {
                key: "guardians",
                label: "Tutores",
              },
            ],
          },
        ],
        "No hay comunidades para mostrar",
        "No se encontraron comunidades para el período seleccionado.",
      ),
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
      analytics: analytics(
        [
          {
            label: "Mediciones",
            value: records.length,
            description: "Registros del resultado generado",
          },
          {
            label: "Niños únicos",
            value: new Set(records.map((record) => record.childId)).size,
            description: "Identificados en el resultado",
          },
          {
            label: "Comunidades",
            value: new Set(records.map((record) => record.child.community.name))
              .size,
            description: "Representadas en el resultado",
          },
        ],
        [
          {
            title: "Actividad de crecimiento por comunidad",
            description: "Cantidad de mediciones del resultado generado.",
            data: countBy(records, (record) => record.child.community.name),
            series: [
              {
                key: "value",
                label: "Mediciones",
              },
            ],
          },
        ],
        "No hay mediciones para mostrar",
        "No se encontraron controles de crecimiento para el período seleccionado.",
      ),
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
      analytics: analytics(
        [
          {
            label: "Aplicaciones",
            value: records.length,
            description: "Registros del resultado generado",
          },
          {
            label: "Niños únicos",
            value: new Set(records.map((record) => record.childId)).size,
            description: "Identificados en el resultado",
          },
          {
            label: "Vacunas",
            value: new Set(
              records.map((record) => record.vaccineSchedule.vaccine.name),
            ).size,
            description: "Tipos presentes en el resultado",
          },
          {
            label: "Comunidades",
            value: new Set(records.map((record) => record.child.community.name))
              .size,
            description: "Representadas en el resultado",
          },
        ],
        [
          {
            title: "Aplicaciones por vacuna",
            description: "Aplicaciones registradas en el resultado generado.",
            data: countBy(
              records,
              (record) => record.vaccineSchedule.vaccine.name,
            ),
            series: [
              {
                key: "value",
                label: "Aplicaciones",
              },
            ],
          },
        ],
        "No hay vacunas aplicadas para mostrar",
        "No se encontraron aplicaciones en el período seleccionado.",
      ),
    };
  }

  if (filters.type === "incomplete-vaccination") {
    const children = await listAuthorizedChildrenVaccinationStatuses(
      user,
      currentInstant,
    );
    const rows: ReportRow[] = [];
    const incomplete: {
      childId: string;
      community: string;
      status: "PENDING" | "OVERDUE";
    }[] = [];
    for (const result of children) {
      for (const dose of result.doses.filter((item) =>
        isIncompleteVaccinationDose(item, result.evaluationDate),
      )) {
        incomplete.push({
          childId: result.child.id,
          community: result.child.community.name,
          status: dose.status === "OVERDUE" ? "OVERDUE" : "PENDING",
        });
        rows.push({
          fecha: dose.scheduledDate,
          centro: result.child.community.healthCenter.name,
          comunidad: result.child.community.name,
          registro: result.child.fullName,
          detalle: `${dose.vaccineName} · ${dose.doseName} · ${dose.status === "OVERDUE" ? "Atrasada" : "Pendiente desde su fecha programada"}`,
        });
      }
    }
    const included = rows
      .map((row, index) => ({
        row,
        detail: incomplete[index],
      }))
      .filter(
        ({ row }) =>
          (!filters.from || row.fecha >= filters.from) &&
          (!filters.to || row.fecha <= filters.to),
      );
    return {
      title: "Reporte de dosis atrasadas",
      rows: included
        .map(({ row }) => row)
        .sort((left, right) => left.fecha.localeCompare(right.fecha)),
      analytics: analytics(
        [
          {
            label: "Dosis para seguimiento",
            value: included.length,
            description: "Registros del resultado generado",
          },
          {
            label: "Niños únicos",
            value: new Set(included.map(({ detail }) => detail?.childId)).size,
            description: "Identificados en el resultado",
          },
          {
            label: "Atrasadas",
            value: included.filter(({ detail }) => detail?.status === "OVERDUE")
              .length,
            description: "En el resultado generado",
          },
          {
            label: "Pendientes desde su fecha",
            value: included.filter(({ detail }) => detail?.status === "PENDING")
              .length,
            description: "En el resultado generado",
          },
        ],
        [
          {
            title: "Dosis para seguimiento por comunidad",
            description:
              "Dosis pendientes desde su fecha y atrasadas del resultado generado.",
            data: [
              ...new Set(
                included.flatMap(({ detail }) =>
                  detail ? [detail.community] : [],
                ),
              ),
            ].map((community) => ({
              label: community,
              pending: included.filter(
                ({ detail }) =>
                  detail?.community === community &&
                  detail.status === "PENDING",
              ).length,
              overdue: included.filter(
                ({ detail }) =>
                  detail?.community === community &&
                  detail.status === "OVERDUE",
              ).length,
            })),
            series: [
              {
                key: "pending",
                label: "Pendientes",
              },
              {
                key: "overdue",
                label: "Atrasadas",
              },
            ],
          },
        ],
        "No hay dosis que requieran seguimiento",
        "No se encontraron dosis pendientes desde su fecha ni atrasadas para los filtros seleccionados.",
      ),
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
    const matches = records.flatMap((record) => {
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
          childId: record.childId,
          community: record.child.community.name,
          row: {
            fecha: measurementDate,
            centro: record.child.community.healthCenter.name,
            comunidad: record.child.community.name,
            registro: record.child.fullName,
            detalle: `${age.years * 12 + age.months} meses · ${record.weightKg.toString()} kg · ${record.heightCm.toString()} cm · percentil ${percentile.toFixed(3)} · Requiere seguimiento`,
          } satisfies ReportRow,
        },
      ];
    });
    return {
      title:
        filters.type === "low-weight"
          ? "Niños con percentil de peso bajo"
          : "Niños con percentil de peso alto",
      rows: matches.map(({ row }) => row),
      analytics: analytics(
        [
          {
            label: "Registros",
            value: matches.length,
            description: "Evaluaciones del resultado generado",
          },
          {
            label: "Niños únicos",
            value: new Set(matches.map(({ childId }) => childId)).size,
            description: "Identificados en el resultado",
          },
          {
            label: "Comunidades",
            value: new Set(matches.map(({ community }) => community)).size,
            description: "Representadas en el resultado",
          },
        ],
        [
          {
            title: "Registros por comunidad",
            description:
              "Evaluaciones que cumplen el criterio del reporte generado.",
            data: countBy(matches, ({ community }) => community),
            series: [
              {
                key: "value",
                label: "Registros",
              },
            ],
          },
        ],
        "No hay registros para mostrar",
        `No se encontraron evaluaciones con percentil de peso ${filters.type === "low-weight" ? "bajo" : "alto"} para los filtros seleccionados.`,
      ),
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
        analytics: analytics(
          [],
          [],
          "Selecciona una dosis",
          "Elige una dosis del esquema vigente para generar el análisis por comunidad.",
        ),
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
        analytics: analytics(
          [],
          [],
          "La dosis no está disponible",
          "Selecciona una dosis válida del esquema vigente.",
        ),
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
    const coverageResults = [...grouped.entries()].map(([key, group]) => {
      const [center, community] = key.split("\u0000");
      const evaluationDate = group[0]?.evaluationDate ?? "";
      const coverage = calculateDoseCoverage(
        group,
        filters.doseCode,
        evaluationDate,
      );
      return {
        numerator: coverage.numerator,
        denominator: coverage.denominator,
        percentage: coverage.percentage,
        row: {
          fecha: evaluationDate,
          centro: center,
          comunidad: community,
          registro: selectedDose.label,
          detalle: `${coverage.numerator}/${coverage.denominator} · ${coverage.percentage === null ? "N/A" : `${coverage.percentage.toFixed(1)} %`}`,
        } satisfies ReportRow,
      };
    });
    return {
      title: `Cobertura por comunidad — ${selectedDose.label}`,
      rows: coverageResults.map(({ row }) => row),
      analytics: analytics(
        [
          {
            label: "Comunidades evaluadas",
            value: coverageResults.length,
            description: "En el resultado generado",
          },
          {
            label: "Con población elegible",
            value: coverageResults.filter(({ denominator }) => denominator > 0)
              .length,
            description: "Comunidades del resultado",
          },
          {
            label: "Aplicadas",
            value: coverageResults.reduce(
              (total, item) => total + item.numerator,
              0,
            ),
            description: "Suma de numeradores; no es cobertura global",
          },
          {
            label: "Elegibles",
            value: coverageResults.reduce(
              (total, item) => total + item.denominator,
              0,
            ),
            description: "Suma de denominadores; no es cobertura global",
          },
        ],
        [
          {
            title: "Cobertura por comunidad",
            description:
              "Porcentaje para la dosis seleccionada; N/A indica que no hay población elegible.",
            data: coverageResults.map((item) => ({
              label: item.row.comunidad,
              percentage: item.percentage,
              numerator: item.numerator,
              denominator: item.denominator,
              detail:
                item.percentage === null
                  ? "N/A"
                  : `${item.numerator}/${item.denominator}`,
            })),
            series: [
              {
                key: "percentage",
                label: "Cobertura",
                unit: "%",
              },
            ],
          },
        ],
        "No hay comunidades para evaluar",
        "No se encontraron comunidades autorizadas para esta dosis.",
      ),
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
    const growthGroups = [...groups.values()];
    return {
      title: "Promedio de crecimiento por comunidad y grupo de edad",
      rows: growthGroups.map((group): ReportRow => ({
        fecha: filters.to || filters.from || "—",
        centro: group.center,
        comunidad: group.community,
        registro: group.band,
        detalle: `${group.children.size} niños · ${group.count} mediciones · peso promedio ${(group.weight / group.count).toFixed(2)} kg · talla promedio ${(group.height / group.count).toFixed(2)} cm`,
      })),
      analytics: analytics(
        [
          {
            label: "Mediciones",
            value: records.length,
            description: "Registros del resultado generado",
          },
          {
            label: "Niños únicos",
            value: new Set(records.map((record) => record.childId)).size,
            description: "Identificados en el resultado",
          },
          {
            label: "Comunidades",
            value: new Set(records.map((record) => record.child.community.name))
              .size,
            description: "Representadas en el resultado",
          },
          {
            label: "Grupos de edad",
            value: new Set(growthGroups.map((group) => group.band)).size,
            description: "Presentes en el resultado",
          },
        ],
        [
          {
            title: "Peso promedio por comunidad y edad",
            description:
              "Cada barra mantiene explícita su banda de edad; promedio por mediciones.",
            data: growthGroups.map((group) => ({
              label: `${group.community} · ${group.band}`,
              averageWeight: Number((group.weight / group.count).toFixed(2)),
            })),
            series: [
              {
                key: "averageWeight",
                label: "Peso promedio",
                unit: " kg",
              },
            ],
          },
          {
            title: "Talla promedio por comunidad y edad",
            description:
              "Cada barra mantiene explícita su banda de edad; promedio por mediciones.",
            data: growthGroups.map((group) => ({
              label: `${group.community} · ${group.band}`,
              averageHeight: Number((group.height / group.count).toFixed(2)),
            })),
            series: [
              {
                key: "averageHeight",
                label: "Talla promedio",
                unit: " cm",
              },
            ],
          },
        ],
        "No hay promedios para mostrar",
        "No se encontraron mediciones para formar grupos por comunidad y edad.",
      ),
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
    analytics: analytics(
      [
        {
          label: "Alertas",
          value: records.length,
          description: "Registros del resultado generado",
        },
        {
          label: "Niños únicos",
          value: new Set(records.map((record) => record.childId)).size,
          description: "Identificados en el resultado",
        },
        {
          label: "Preventivas",
          value: records.filter((record) => record.severity === "PREVENTIVE")
            .length,
          description: "En el resultado generado",
        },
        {
          label: "Críticas",
          value: records.filter((record) => record.severity === "CRITICAL")
            .length,
          description: "En el resultado generado",
        },
      ],
      [
        {
          title: "Alertas por estado y severidad",
          description: "Distribución de las alertas del resultado generado.",
          data: (["OPEN", "REVIEWED", "RESOLVED"] as const).map((status) => ({
            label: alertStatusLabels[status],
            preventive: records.filter(
              (record) =>
                record.status === status && record.severity === "PREVENTIVE",
            ).length,
            critical: records.filter(
              (record) =>
                record.status === status && record.severity === "CRITICAL",
            ).length,
          })),
          series: [
            {
              key: "preventive",
              label: "Preventivas",
            },
            {
              key: "critical",
              label: "Críticas",
            },
          ],
        },
      ],
      "No hay alertas para mostrar",
      "No se encontraron alertas para el período seleccionado.",
    ),
  };
}
