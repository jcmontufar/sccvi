import { createHash } from "node:crypto";

import { z } from "zod";

export const WHO_STANDARD_NAME = "WHO Child Growth Standards";
export const WHO_STANDARD_VERSION = "2006";
export const WHO_MIN_AGE_DAYS = 0;
export const WHO_MAX_AGE_DAYS = 1856;
export const WHO_REFERENCE_ROW_COUNT_PER_INDICATOR = 3714;

export const whoReferenceFiles = {
  WEIGHT_FOR_AGE: {
    fileName: "weight-for-age.csv",
    sha256: "62d1d0d3d68bcc5a6a6c50d07f0acf0ea99e9f49d873d6ca185d4259da730ded",
  },
  HEIGHT_FOR_AGE: {
    fileName: "length-height-for-age.csv",
    sha256: "1f504e7fd1d1b13f55efa909a20d24cae618072146712996240380822ad0a921",
  },
} as const;

const rowSchema = z.object({
  standardName: z.literal(WHO_STANDARD_NAME),
  standardVersion: z.literal(WHO_STANDARD_VERSION),
  sex: z.enum(["MALE", "FEMALE"]),
  indicator: z.enum(["WEIGHT_FOR_AGE", "HEIGHT_FOR_AGE"]),
  ageDays: z.coerce.number().int().min(WHO_MIN_AGE_DAYS).max(WHO_MAX_AGE_DAYS),
  l: z.coerce.number().finite(),
  m: z.coerce.number().finite().positive(),
  s: z.coerce.number().finite().positive(),
  measurementMode: z.enum(["", "L", "H"]),
});

export type WhoReferenceRow = z.infer<typeof rowSchema>;

const header =
  "standardName,standardVersion,sex,indicator,ageDays,l,m,s,measurementMode";

export function sha256(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function parseWhoReferenceCsv(
  text: string,
  expectedIndicator: WhoReferenceRow["indicator"],
) {
  const lines = text.trimEnd().split(/\r?\n/);
  if (lines.shift() !== header) {
    throw new Error(
      "El encabezado del archivo de referencia OMS no es válido.",
    );
  }

  const rows = lines.map((line) => {
    const values = line.split(",");
    if (values.length !== 9) {
      throw new Error("Una fila del archivo de referencia OMS no es válida.");
    }
    return rowSchema.parse({
      standardName: values[0],
      standardVersion: values[1],
      sex: values[2],
      indicator: values[3],
      ageDays: values[4],
      l: values[5],
      m: values[6],
      s: values[7],
      measurementMode: values[8],
    });
  });

  if (rows.length !== WHO_REFERENCE_ROW_COUNT_PER_INDICATOR) {
    throw new Error(
      "El archivo de referencia OMS no tiene la cantidad esperada de filas.",
    );
  }

  for (const sex of ["MALE", "FEMALE"] as const) {
    const sexRows = rows.filter((row) => row.sex === sex);
    if (sexRows.length !== WHO_MAX_AGE_DAYS + 1) {
      throw new Error("La referencia OMS no cubre todas las edades esperadas.");
    }
    sexRows.forEach((row, ageDays) => {
      if (row.ageDays !== ageDays || row.indicator !== expectedIndicator) {
        throw new Error(
          "La referencia OMS no conserva la secuencia edad/indicador.",
        );
      }
      const expectedMode =
        expectedIndicator === "WEIGHT_FOR_AGE" ? "" : ageDays < 731 ? "L" : "H";
      if (row.measurementMode !== expectedMode) {
        throw new Error(
          "El modo de medición de la referencia OMS no es válido.",
        );
      }
    });
  }

  return rows;
}
