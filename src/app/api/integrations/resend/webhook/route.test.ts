import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  updateMany: vi.fn(),
}));
vi.mock("resend", () => ({
  Resend: class {
    webhooks = { verify: mocks.verify };
  },
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ notification: { updateMany: mocks.updateMany } }),
}));
vi.mock("@/lib/env/server-env", () => ({
  getServerEnvironment: () => ({
    EMAIL_API_KEY: "email-api-key",
    RESEND_WEBHOOK_SECRET: "webhook-secret",
  }),
}));

import { POST } from "@/app/api/integrations/resend/webhook/route";

function request() {
  return new Request("https://example.test/api/integrations/resend/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": "msg_test",
      "svix-timestamp": "1",
      "svix-signature": "v1,signature",
    },
    body: JSON.stringify({ type: "email.delivered", data: {} }),
  });
}

describe("Resend webhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fails closed when the signature is invalid", async () => {
    mocks.verify.mockImplementation(() => {
      throw new Error("invalid signature");
    });
    expect((await POST(request())).status).toBe(401);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it.each(["email.bounced", "email.failed", "email.suppressed"])(
    "marks a %s delivery as failed",
    async (type) => {
      mocks.verify.mockReturnValue({
        type,
        data: { email_id: "provider-message-1" },
      });
      expect((await POST(request())).status).toBe(200);
      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: {
          providerMessageId: "provider-message-1",
          channel: "EMAIL",
        },
        data: expect.objectContaining({ status: "FAILED" }),
      });
    },
  );

  it("keeps a delivered email in sent state", async () => {
    mocks.verify.mockReturnValue({
      type: "email.delivered",
      data: { email_id: "provider-message-1" },
    });
    await POST(request());
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        providerMessageId: "provider-message-1",
        channel: "EMAIL",
      },
      data: { status: "SENT", errorMessage: null },
    });
  });
});
