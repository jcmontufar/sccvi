import { describe, expect, it } from "vitest";

import type { EvaluatedVaccinationDose } from "@/modules/vaccination/services/vaccination-status";
import {
  buildVaccinationTimeline,
  getVaccinationAttention,
} from "@/modules/vaccination/services/vaccination-timeline";

function dose(
  id: string,
  scheduledDate: string,
  status: EvaluatedVaccinationDose["status"],
): EvaluatedVaccinationDose {
  return {
    id,
    doseCode: id,
    doseName: "Primera dosis",
    vaccineName: "Vacuna ficticia",
    scheduledDate,
    timingNote: null,
    status,
    applicable: true,
    vaccinationId: status === "APPLIED" ? `vaccination-${id}` : null,
    applicationDate: status === "APPLIED" ? scheduledDate : null,
  };
}

describe("vaccination timeline presentation", () => {
  it("groups evaluated doses chronologically by their existing target date", () => {
    const timeline = buildVaccinationTimeline("2026-01-12", [
      dose("six-month", "2026-07-12", "PENDING"),
      dose("birth-a", "2026-01-12", "APPLIED"),
      dose("birth-b", "2026-01-12", "APPLIED"),
      dose("two-month", "2026-03-12", "OVERDUE"),
    ]);

    expect(timeline.map(({ stageLabel }) => stageLabel)).toEqual([
      "Nacimiento",
      "2 meses",
      "6 meses",
    ]);
    expect(timeline[0]?.doses).toHaveLength(2);
    expect(timeline[1]?.doses[0]?.id).toBe("two-month");
  });

  it("selects overdue doses and the earliest pending dose without recalculating status", () => {
    const attention = getVaccinationAttention([
      dose("pending-later", "2027-01-12", "PENDING"),
      dose("overdue", "2026-03-12", "OVERDUE"),
      dose("applied", "2026-01-12", "APPLIED"),
      dose("pending-next", "2026-09-12", "PENDING"),
    ]);

    expect(attention.overdue.map(({ id }) => id)).toEqual(["overdue"]);
    expect(attention.nextPending?.id).toBe("pending-next");
  });

  it("returns an empty attention state when no follow-up is required", () => {
    const attention = getVaccinationAttention([
      dose("applied", "2026-01-12", "APPLIED"),
    ]);
    expect(attention).toEqual({ overdue: [], nextPending: null });
  });
});
