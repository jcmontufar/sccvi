import "server-only";

import {
  createResendEmailProvider,
  unavailableEmailProvider,
} from "@/modules/notifications/providers/resend-email-provider";
import {
  createTelegramProvider,
  unavailableTelegramProvider,
} from "@/modules/notifications/providers/telegram-provider";
import type {
  DeliverableNotificationChannel,
  NotificationProvider,
  NotificationProviderRegistry,
} from "@/modules/notifications/services/notification-delivery";

export class ProviderRegistry implements NotificationProviderRegistry {
  constructor(
    private readonly providers: ReadonlyMap<
      DeliverableNotificationChannel,
      NotificationProvider
    >,
  ) {}

  get(channel: DeliverableNotificationChannel) {
    const provider = this.providers.get(channel);
    if (!provider || provider.channel !== channel) {
      throw new Error("NOTIFICATION_PROVIDER_CHANNEL_MISMATCH");
    }
    return provider;
  }
}

export type NotificationProviderSource =
  NotificationProviderRegistry | NotificationProvider;

export function asProviderRegistry(
  source: NotificationProviderSource,
): NotificationProviderRegistry {
  if ("get" in source) return source;
  return {
    get(channel) {
      if (source.channel !== channel) {
        throw new Error("NOTIFICATION_PROVIDER_CHANNEL_MISMATCH");
      }
      return source;
    },
  };
}

export function createNotificationProviderRegistry() {
  return new ProviderRegistry(
    new Map<DeliverableNotificationChannel, NotificationProvider>([
      ["EMAIL", createResendEmailProvider() ?? unavailableEmailProvider],
      ["TELEGRAM", createTelegramProvider() ?? unavailableTelegramProvider],
    ]),
  );
}
