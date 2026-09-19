import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { TelegramProvider } from "@/modules/notifications/providers/telegram-provider";

describe("TelegramProvider", () => {
  it("sends through the Bot API without exposing the token in the payload", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 27 } }), {
        status: 200,
      }),
    );
    const provider = new TelegramProvider("server-secret", fetcher);
    await expect(
      provider.deliver({ destination: "123", message: "Aviso SCCVI" }),
    ).resolves.toEqual({ delivered: true, providerMessageId: "27" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.telegram.org/botserver-secret/sendMessage",
      expect.objectContaining({
        body: JSON.stringify({
          chat_id: "123",
          text: "Aviso SCCVI",
          protect_content: true,
        }),
      }),
    );
  });

  it("records a safe failure without provider details", async () => {
    const provider = new TelegramProvider(
      "server-secret",
      vi.fn<typeof fetch>().mockRejectedValue(new Error("sensitive")),
    );
    await expect(
      provider.deliver({ destination: "123", message: "Aviso" }),
    ).resolves.toEqual({
      delivered: false,
      errorMessage: "No fue posible enviar el mensaje mediante Telegram.",
    });
  });
});
