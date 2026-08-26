import { describe, expect, it } from "vitest";

describe("Playwright configuration", () => {
  it("loads without top-level await and registers the asynchronous preflight", async () => {
    const { default: configuration } =
      await import("../../../playwright.config");

    expect(configuration.globalSetup).toBe("./tests/e2e/global-setup.ts");
    expect(configuration.projects?.map(({ name }) => name)).toEqual([
      "chromium",
      "mobile-chromium",
    ]);
    expect(configuration.use).toMatchObject({ trace: "off", video: "off" });
  });
});
