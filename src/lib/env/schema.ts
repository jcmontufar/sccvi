import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

export const optionalUrl = z.preprocess(
  emptyStringToUndefined,
  z.url().optional(),
);

export const optionalString = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).optional(),
);

export const optionalPostgresUrl = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .regex(
      /^postgres(?:ql)?:\/\//,
      "Must be a PostgreSQL connection URL beginning with postgres:// or postgresql://",
    )
    .optional(),
);

export function formatEnvironmentError(error: z.ZodError) {
  return `Invalid environment configuration:\n${z.prettifyError(error)}`;
}
