export const DIGITAL_CARD_GROWTH_RECORD_LIMIT = 5;

export type DigitalCardData = {
  fullName: string;
  dateOfBirth: string;
  sex: "MALE" | "FEMALE";
  vaccinations: {
    vaccine: string;
    dose: string;
    applicationDate: string;
  }[];
  growthRecords: {
    measurementDate: string;
    weightKg: string;
    heightCm: string;
  }[];
};

export function toDigitalCardData(child: {
  fullName: string;
  dateOfBirth: Date;
  sex: "MALE" | "FEMALE";
  vaccinations: readonly {
    applicationDate: Date;
    vaccineSchedule: {
      doseName: string | null;
      doseNumber: number;
      vaccine: { name: string };
    };
  }[];
  growthRecords: readonly {
    measurementDate: Date;
    weightKg: { toString(): string };
    heightCm: { toString(): string };
  }[];
}): DigitalCardData {
  return {
    fullName: child.fullName,
    dateOfBirth: child.dateOfBirth.toISOString().slice(0, 10),
    sex: child.sex,
    vaccinations: child.vaccinations.map((vaccination) => ({
      vaccine: vaccination.vaccineSchedule.vaccine.name,
      dose:
        vaccination.vaccineSchedule.doseName ??
        `Dosis ${vaccination.vaccineSchedule.doseNumber}`,
      applicationDate: vaccination.applicationDate.toISOString().slice(0, 10),
    })),
    growthRecords: child.growthRecords.map((record) => ({
      measurementDate: record.measurementDate.toISOString().slice(0, 10),
      weightKg: record.weightKg.toString(),
      heightCm: record.heightCm.toString(),
    })),
  };
}
