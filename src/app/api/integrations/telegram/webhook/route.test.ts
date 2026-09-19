import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  unlink: vi.fn(),
  deliver: vi.fn().mockResolvedValue({ delivered: true }),
}));
vi.mock("@/modules/notifications/services/telegram-link-service", () => ({
  consumeTelegramLink: mocks.consume,
  unlinkTelegramByChat: mocks.unlink,
}));
vi.mock("@/modules/notifications/providers/telegram-provider", () => ({
  TelegramProvider: class {
    deliver = mocks.deliver;
  },
}));
vi.mock("@/lib/env/server-env", () => ({
  getServerEnvironment: () => ({
    TELEGRAM_BOT_TOKEN: "bot-token",
    TELEGRAM_WEBHOOK_SECRET: "webhook-secret",
  }),
}));

import { POST } from "@/app/api/integrations/telegram/webhook/route";

describe("Telegram webhook", () => {
  it("fails closed for an invalid webhook secret", async () => {
    const response = await POST(
      new Request("https://example.test/api/integrations/telegram/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "wrong-secret",
        },
        body: JSON.stringify({ update_id: 1 }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("consumes only the opaque start token and webhook chat identity", async () => {
    const response = await POST(
      new Request("https://example.test/api/integrations/telegram/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "webhook-secret",
        },
        body: JSON.stringify({
          update_id: 2,
          message: {
            text: `/start ${"a".repeat(43)}`,
            chat: { id: 12345, type: "private" },
          },
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.consume).toHaveBeenCalledWith("a".repeat(43), "12345");
  });

  it("unlinks only the chat identity supplied by Telegram on /stop", async () => {
    const response = await POST(
      new Request("https://example.test/api/integrations/telegram/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "webhook-secret",
        },
        body: JSON.stringify({
          update_id: 3,
          message: {
            text: "/stop",
            chat: { id: 12345, type: "private" },
          },
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.unlink).toHaveBeenCalledWith("12345");
  });
});
