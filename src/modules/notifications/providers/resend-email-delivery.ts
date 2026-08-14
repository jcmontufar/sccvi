import type {
  NotificationMessage,
  NotificationProvider,
} from "@/modules/notifications/services/notification-delivery";

export type SendEmail = (
  input: {
    from: string;
    to: string;
    subject: string;
    text: string;
  },
  options?: { idempotencyKey?: string },
) => Promise<{
  data: { id: string } | null;
  error: { message?: string } | null;
}>;

type ResendConfiguration = {
  EMAIL_PROVIDER?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
};

export function isResendConfigured(
  environment: ResendConfiguration,
): environment is Required<ResendConfiguration> {
  return Boolean(
    environment.EMAIL_PROVIDER?.toLowerCase() === "resend" &&
    environment.EMAIL_API_KEY &&
    environment.EMAIL_FROM,
  );
}

export class ResendEmailProvider implements NotificationProvider {
  readonly channel = "EMAIL" as const;

  constructor(
    private readonly sendEmail: SendEmail,
    private readonly from: string,
  ) {}

  async deliver(message: NotificationMessage) {
    try {
      const result = await this.sendEmail(
        {
          from: this.from,
          to: message.destination,
          subject: message.subject ?? "Notificación de SCCVI",
          text: message.message,
        },
        message.idempotencyKey
          ? { idempotencyKey: message.idempotencyKey }
          : undefined,
      );
      if (result.error || !result.data?.id) {
        return {
          delivered: false as const,
          errorMessage: "No fue posible enviar el correo mediante Resend.",
        };
      }
      return { delivered: true as const, providerMessageId: result.data.id };
    } catch {
      return {
        delivered: false as const,
        errorMessage: "No fue posible enviar el correo mediante Resend.",
      };
    }
  }
}
