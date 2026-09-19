import "server-only";

import type { ServerEnvironment } from "@/lib/env/server-env";
import { getServerEnvironment } from "@/lib/env/server-env";
import type {
  NotificationMessage,
  NotificationProvider,
} from "@/modules/notifications/services/notification-delivery";

type TelegramSendResponse = {
  ok?: boolean;
  result?: { message_id?: number };
};

export class TelegramProvider implements NotificationProvider {
  readonly channel = "TELEGRAM" as const;

  constructor(
    private readonly botToken: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async deliver(message: NotificationMessage) {
    try {
      const response = await this.fetcher(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: message.destination,
            text: message.message,
            protect_content: true,
          }),
        },
      );
      const payload = (await response.json()) as TelegramSendResponse;
      if (!response.ok || !payload.ok || !payload.result?.message_id) {
        return {
          delivered: false as const,
          errorMessage: "No fue posible enviar el mensaje mediante Telegram.",
        };
      }
      return {
        delivered: true as const,
        providerMessageId: String(payload.result.message_id),
      };
    } catch {
      return {
        delivered: false as const,
        errorMessage: "No fue posible enviar el mensaje mediante Telegram.",
      };
    }
  }
}

export function createTelegramProvider(
  environment: ServerEnvironment = getServerEnvironment(),
) {
  return environment.TELEGRAM_BOT_TOKEN
    ? new TelegramProvider(environment.TELEGRAM_BOT_TOKEN)
    : null;
}

export const unavailableTelegramProvider: NotificationProvider = {
  channel: "TELEGRAM",
  async deliver() {
    return {
      delivered: false,
      errorMessage: "El proveedor de Telegram no está configurado.",
    };
  },
};
