import { describe, expect, it } from "vitest";

import { toDigitalCardData } from "@/modules/qr/services/digital-card";

describe("protected digital card projection", () => {
  it("exposes only approved vaccination and growth fields", () => {
    const result = toDigitalCardData({
      fullName: "Niña Ficticia",
      dateOfBirth: new Date("2025-01-02T00:00:00Z"),
      sex: "FEMALE",
      vaccinations: [
        {
          applicationDate: new Date("2025-01-03T00:00:00Z"),
          vaccineSchedule: {
            doseName: "Dosis única",
            doseNumber: 1,
            vaccine: { name: "BCG" },
          },
        },
      ],
      growthRecords: [
        {
          measurementDate: new Date("2026-01-02T00:00:00Z"),
          weightKg: { toString: () => "9.2" },
          heightCm: { toString: () => "74.1" },
        },
      ],
    });
    expect(result.vaccinations[0]).toEqual({
      vaccine: "BCG",
      dose: "Dosis única",
      applicationDate: "2025-01-03",
    });
    expect(result.growthRecords[0]).toEqual({
      measurementDate: "2026-01-02",
      weightKg: "9.2",
      heightCm: "74.1",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /guardian|notes|childId|token|hash|alert|audit|email/i,
    );
  });
});
