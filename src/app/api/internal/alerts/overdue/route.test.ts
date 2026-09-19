import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cronSecret: "fixture-secret-at-least-16-characters" as string | undefined,
  runJob: vi.fn(),
}));

vi.mock("@/lib/env/server-env", () => ({
  getServerEnvironment: () => ({ CRON_SECRET: mocks.cronSecret }),
}));
vi.mock("@/modules/alerts/services/overdue-alert-job", () => ({
  runOverdueAlertJob: mocks.runJob,
}));

import { GET } from "@/app/api/internal/alerts/overdue/route";

describe("protected overdue alert endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cronSecret = "fixture-secret-at-least-16-characters";
    mocks.runJob.mockResolvedValue({ errors: [], centersProcessed: 2 });
  });

  it("fails closed when server configuration is missing", async () => {
    mocks.cronSecret = undefined;
    const response = await GET(
      new Request("http://localhost/api/internal/alerts/overdue"),
    );
    expect(response.status).toBe(503);
    expect(mocks.runJob).not.toHaveBeenCalled();
  });

  it("rejects an incorrect secret", async () => {
    const response = await GET(
      new Request("http://localhost/api/internal/alerts/overdue", {
        headers: { authorization: "Bearer incorrect-secret" },
      }),
    );
    expect(response.status).toBe(401);
    expect(mocks.runJob).not.toHaveBeenCalled();
  });

  it("runs without a human session when the dedicated secret is valid", async () => {
    const response = await GET(
      new Request("http://localhost/api/internal/alerts/overdue", {
        headers: { authorization: `Bearer ${mocks.cronSecret}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.runJob).toHaveBeenCalledTimes(1);
  });
});
