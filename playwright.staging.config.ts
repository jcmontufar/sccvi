import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

import { validateStagingEnvironment } from "./src/lib/staging/staging-environment";

config({ path: ".env.staging.local", quiet: true });
const environment = validateStagingEnvironment(process.env);
const smokeBaseUrl = process.env.STAGING_BASE_URL ?? environment.APP_URL;
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./tests/staging-smoke",
  globalSetup: "./tests/staging-smoke/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: smokeBaseUrl,
    extraHTTPHeaders: protectionBypass
      ? { "x-vercel-protection-bypass": protectionBypass }
      : undefined,
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [
    { name: "staging-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
