import "server-only";

import { Resend } from "resend";

import type { ServerEnvironment } from "@/lib/env/server-env";
import { getServerEnvironment } from "@/lib/env/server-env";
import {
  isResendConfigured,
  ResendEmailProvider,
} from "@/modules/notifications/providers/resend-email-delivery";
import type { NotificationProvider } from "@/modules/notifications/services/notification-delivery";

export function createResendEmailProvider(
  environment: ServerEnvironment = getServerEnvironment(),
) {
  if (!isResendConfigured(environment)) {
    return null;
  }
  const resend = new Resend(environment.EMAIL_API_KEY);
  return new ResendEmailProvider(
    (input, options) => resend.emails.send(input, options),
    environment.EMAIL_FROM,
  );
}

export const unavailableEmailProvider: NotificationProvider = {
  channel: "EMAIL",
  async deliver() {
    return {
      delivered: false,
      errorMessage: "El proveedor de correo no está configurado.",
    };
  },
};
