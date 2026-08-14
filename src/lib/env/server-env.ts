import "server-only";

import { z } from "zod";

import {
  formatEnvironmentError,
  optionalPostgresUrl,
  optionalString,
  optionalUrl,
} from "./schema";

export const serverEnvironmentSchema = z.object({
  APP_URL: optionalUrl,
  DATABASE_URL: optionalPostgresUrl,
  DIRECT_URL: optionalPostgresUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  EMAIL_PROVIDER: optionalString,
  EMAIL_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  QR_SECRET: optionalString,
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function getServerEnvironment(): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse({
    APP_URL: process.env.APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_API_KEY: process.env.EMAIL_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    QR_SECRET: process.env.QR_SECRET,
  });

  if (!result.success) {
    throw new Error(formatEnvironmentError(result.error));
  }

  return result.data;
}
