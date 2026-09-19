import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const optionalResendProvider = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.literal("resend").optional(),
);

const stagingEnvironmentSchema = z
  .object({
    SCCVI_DEPLOYMENT_ENV: z.literal("STAGING"),
    STAGING_DATABASE_ID: z.uuid(),
    APP_URL: z.url().refine((value) => value.startsWith("https://"), {
      message: "APP_URL must use HTTPS for staging.",
    }),
    DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//),
    DIRECT_URL: z.string().regex(/^postgres(?:ql)?:\/\//),
    NEXT_PUBLIC_SUPABASE_URL: z
      .url()
      .refine((value) => value.startsWith("https://")),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    EMAIL_PROVIDER: optionalResendProvider,
    EMAIL_API_KEY: optionalNonEmptyString,
    EMAIL_FROM: optionalNonEmptyString,
    RESEND_WEBHOOK_SECRET: optionalNonEmptyString,
    TELEGRAM_BOT_TOKEN: optionalNonEmptyString,
    TELEGRAM_BOT_USERNAME: optionalNonEmptyString,
    TELEGRAM_WEBHOOK_SECRET: optionalNonEmptyString,
    TEST_DATABASE_URL: z.string().optional(),
  })
  .superRefine((environment, context) => {
    if (environment.APP_URL !== "https://sccvi-staging.vercel.app") {
      context.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "APP_URL must be the approved SCCVI staging origin.",
      });
    }
    if (
      environment.TEST_DATABASE_URL &&
      [environment.DATABASE_URL, environment.DIRECT_URL].includes(
        environment.TEST_DATABASE_URL,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["TEST_DATABASE_URL"],
        message: "Staging must not reuse the isolated test database.",
      });
    }
    const emailValues = [
      environment.EMAIL_PROVIDER,
      environment.EMAIL_API_KEY,
      environment.EMAIL_FROM,
      environment.RESEND_WEBHOOK_SECRET,
    ];
    const configuredEmailValues = emailValues.filter(Boolean).length;
    if (configuredEmailValues !== 0 && configuredEmailValues !== 4) {
      context.addIssue({
        code: "custom",
        path: ["EMAIL_PROVIDER"],
        message: "Staging email configuration must be complete or omitted.",
      });
    }
    const telegramValues = [
      environment.TELEGRAM_BOT_TOKEN,
      environment.TELEGRAM_BOT_USERNAME,
      environment.TELEGRAM_WEBHOOK_SECRET,
    ];
    const configuredTelegramValues = telegramValues.filter(Boolean).length;
    if (configuredTelegramValues !== 0 && configuredTelegramValues !== 3) {
      context.addIssue({
        code: "custom",
        path: ["TELEGRAM_BOT_TOKEN"],
        message: "Staging Telegram configuration must be complete or omitted.",
      });
    }
  });

export type StagingEnvironment = z.infer<typeof stagingEnvironmentSchema>;

type Environment = Record<string, string | undefined>;

export function validateStagingEnvironment(
  environment: Environment,
): StagingEnvironment {
  const result = stagingEnvironmentSchema.safeParse(environment);
  if (!result.success) {
    throw new Error(
      "STAGING PREFLIGHT BLOCKED: required staging configuration is missing, invalid, or points at a forbidden target.",
    );
  }
  return result.data;
}

export function requireExplicitStagingConfirmation(
  environment: Environment,
  variable: string,
  expectedValue: string,
) {
  if (environment[variable] !== expectedValue) {
    throw new Error(
      `STAGING OPERATION BLOCKED: explicit ${variable} confirmation is missing.`,
    );
  }
}
