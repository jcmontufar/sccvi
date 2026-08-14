export type GrowthIndicator = "WEIGHT_FOR_AGE" | "HEIGHT_FOR_AGE";
export type GrowthMeasurementMethod = "RECUMBENT_LENGTH" | "STANDING_HEIGHT";

export type LmsReference = {
  indicator: GrowthIndicator;
  l: number;
  m: number;
  s: number;
};

export type SelectableGrowthReference = LmsReference & {
  standardName: string;
  standardVersion: string;
  sex: "MALE" | "FEMALE";
  ageDays: number;
};

export function selectGrowthReference(
  references: readonly SelectableGrowthReference[],
  selector: {
    standardName: string;
    standardVersion: string;
    sex: "MALE" | "FEMALE";
    ageDays: number;
    indicator: GrowthIndicator;
  },
) {
  if (!Number.isInteger(selector.ageDays) || selector.ageDays < 0) {
    throw new RangeError("Growth reference age must be a non-negative integer");
  }
  const reference = references.find(
    (candidate) =>
      candidate.standardName === selector.standardName &&
      candidate.standardVersion === selector.standardVersion &&
      candidate.sex === selector.sex &&
      candidate.ageDays === selector.ageDays &&
      candidate.indicator === selector.indicator,
  );
  if (!reference) throw new RangeError("Growth reference was not found");
  return reference;
}

function rawLmsZScore(value: number, reference: LmsReference) {
  if (reference.l === 0) {
    return Math.log(value / reference.m) / reference.s;
  }
  return (
    (Math.pow(value / reference.m, reference.l) - 1) /
    (reference.l * reference.s)
  );
}

function valueAtZScore(zScore: number, reference: LmsReference) {
  if (reference.l === 0) {
    return reference.m * Math.exp(reference.s * zScore);
  }
  return (
    reference.m *
    Math.pow(1 + reference.l * reference.s * zScore, 1 / reference.l)
  );
}

export function calculateLmsZScore(value: number, reference: LmsReference) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError("Growth measurement must be positive and finite");
  }
  if (
    !Number.isFinite(reference.l) ||
    !Number.isFinite(reference.m) ||
    reference.m <= 0 ||
    !Number.isFinite(reference.s) ||
    reference.s <= 0
  ) {
    throw new RangeError("LMS reference is invalid");
  }

  const raw = rawLmsZScore(value, reference);
  if (reference.indicator !== "WEIGHT_FOR_AGE" || Math.abs(raw) <= 3) {
    return raw;
  }

  if (raw > 3) {
    const sd2 = valueAtZScore(2, reference);
    const sd3 = valueAtZScore(3, reference);
    return 3 + (value - sd3) / (sd3 - sd2);
  }

  const sd2 = valueAtZScore(-2, reference);
  const sd3 = valueAtZScore(-3, reference);
  return -3 - (sd3 - value) / (sd2 - sd3);
}

export function normalizeLengthHeight(
  valueCm: number,
  ageDays: number,
  method: GrowthMeasurementMethod,
) {
  if (ageDays < 731 && method === "STANDING_HEIGHT") return valueCm + 0.7;
  if (ageDays >= 731 && method === "RECUMBENT_LENGTH") return valueCm - 0.7;
  return valueCm;
}

export function referenceMedianForMeasurementMethod(
  medianCm: number,
  ageDays: number,
  method: GrowthMeasurementMethod,
) {
  if (ageDays < 731 && method === "STANDING_HEIGHT") return medianCm - 0.7;
  if (ageDays >= 731 && method === "RECUMBENT_LENGTH") return medianCm + 0.7;
  return medianCm;
}

function errorFunction(value: number) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const polynomial =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
    t;
  return sign * (1 - polynomial * Math.exp(-x * x));
}

export function zScoreToPercentile(zScore: number) {
  if (!Number.isFinite(zScore)) throw new RangeError("Z-score must be finite");
  return (1 + errorFunction(zScore / Math.SQRT2)) * 50;
}
