import { NextResponse } from "next/server";
import { Resend } from "resend";

import { getServerEnvironment } from "@/lib/env/server-env";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const environment = getServerEnvironment();
  if (!environment.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json({ success: false }, { status: 503 });
  }
  const payload = await request.text();
  let event;
  try {
    event = new Resend(
      environment.EMAIL_API_KEY ?? "webhook-verification-only",
    ).webhooks.verify({
      payload,
      webhookSecret: environment.RESEND_WEBHOOK_SECRET,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
    });
  } catch {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  if (!event.type.startsWith("email.")) {
    return NextResponse.json({ success: true });
  }
  const providerMessageId = (event.data as { email_id: string }).email_id;
  if (event.type === "email.delivered") {
    await getPrisma().notification.updateMany({
      where: { providerMessageId, channel: "EMAIL" },
      data: { status: "SENT", errorMessage: null },
    });
  } else if (
    event.type === "email.bounced" ||
    event.type === "email.failed" ||
    event.type === "email.suppressed"
  ) {
    await getPrisma().notification.updateMany({
      where: { providerMessageId, channel: "EMAIL" },
      data: {
        status: "FAILED",
        errorMessage: "Resend informó que el correo no fue entregado.",
      },
    });
  }
  return NextResponse.json({ success: true });
}
