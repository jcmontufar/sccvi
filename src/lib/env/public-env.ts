import { z } from "zod";

import { formatEnvironmentError, optionalString, optionalUrl } from "./schema";

export const publicEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  })
  .superRefine((environment, context) => {
    const hasUrl = environment.NEXT_PUBLIC_SUPABASE_URL !== undefined;
    const hasAnonKey = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined;

    if (hasUrl !== hasAnonKey) {
      context.addIssue({
        code: "custom",
        message:
          "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured together",
      });
    }
  });

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;

export type SupabasePublicEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

export function getPublicEnvironment(): PublicEnvironment {
  const result = publicEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    throw new Error(formatEnvironmentError(result.error));
  }

  return result.data;
}

export function getSupabasePublicEnvironment(): SupabasePublicEnvironment {
  const environment = getPublicEnvironment();

  if (
    !environment.NEXT_PUBLIC_SUPABASE_URL ||
    !environment.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: environment.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
