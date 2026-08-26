import { defineConfig, devices } from "@playwright/test";

import "./tests/support/load-test-environment";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "off",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_EXTERNAL_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
          DIRECT_URL: process.env.TEST_DATABASE_URL ?? "",
          APP_URL: baseURL,
          NEXT_PUBLIC_SUPABASE_URL: process.env.E2E_SUPABASE_URL ?? "",
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.E2E_SUPABASE_ANON_KEY ?? "",
        },
      },
});
