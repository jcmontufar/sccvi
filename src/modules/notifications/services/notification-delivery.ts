export type NotificationMessage = {
  destination: string;
  subject?: string;
  message: string;
};

export type NotificationDeliveryResult =
  | { delivered: true; providerMessageId?: string }
  | { delivered: false; errorMessage: string };

export interface NotificationProvider {
  readonly channel: "EMAIL";
  deliver(message: NotificationMessage): Promise<NotificationDeliveryResult>;
}

export function deliveryResultToUpdate(result: NotificationDeliveryResult) {
  return result.delivered
    ? {
        status: "SENT" as const,
        providerMessageId: result.providerMessageId ?? null,
        errorMessage: null,
        sentAt: new Date(),
      }
    : {
        status: "FAILED" as const,
        providerMessageId: null,
        errorMessage: result.errorMessage,
        sentAt: null,
      };
}
