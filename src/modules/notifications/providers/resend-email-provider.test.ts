import { describe, expect, it, vi } from "vitest";

import {
  isResendConfigured,
  ResendEmailProvider,
} from "@/modules/notifications/providers/resend-email-delivery";

describe("Resend email provider", () => {
  it("remains unavailable when build-time email variables are absent", () => {
    expect(isResendConfigured({})).toBe(false);
    expect(
      isResendConfigured({
        EMAIL_PROVIDER: "resend",
        EMAIL_API_KEY: "configured-for-test",
        EMAIL_FROM: "SCCVI <no-reply@example.org>",
      }),
    ).toBe(true);
  });
  it("returns an adapter-confirmed message id", async () => {
    const send = vi.fn().mockResolvedValue({
      data: { id: "resend-message-id" },
      error: null,
    });
    const provider = new ResendEmailProvider(
      send,
      "SCCVI <no-reply@example.org>",
    );
    await expect(
      provider.deliver({
        destination: "guardian@example.org",
        subject: "Seguimiento",
        message: "Mensaje operativo",
        idempotencyKey: "notification/test",
      }),
    ).resolves.toEqual({
      delivered: true,
      providerMessageId: "resend-message-id",
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "guardian@example.org" }),
      { idempotencyKey: "notification/test" },
    );
  });

  it("returns a safe Spanish failure without leaking provider details", async () => {
    const provider = new ResendEmailProvider(
      vi.fn().mockRejectedValue(new Error("secret provider response")),
      "SCCVI <no-reply@example.org>",
    );
    const result = await provider.deliver({
      destination: "guardian@example.org",
      message: "Mensaje",
    });
    expect(result).toEqual({
      delivered: false,
      errorMessage: "No fue posible enviar el correo mediante Resend.",
    });
    expect(JSON.stringify(result)).not.toContain("secret provider response");
  });
});
