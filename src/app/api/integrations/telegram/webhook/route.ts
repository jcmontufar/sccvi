import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnvironment } from "@/lib/env/server-env";
import { matchesSecret } from "@/lib/security/constant-time-secret";
import { TelegramProvider } from "@/modules/notifications/providers/telegram-provider";
import {
  consumeTelegramLink,
  unlinkTelegramByChat,
} from "@/modules/notifications/services/telegram-link-service";

const telegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      text: z.string().max(200).optional(),
      chat: z.object({
        id: z.union([z.number().int(), z.string()]).transform(String),
        type: z.string(),
      }),
    })
    .optional(),
});

const startCommand = /^\/start(?:@[A-Za-z0-9_]+)?\s+([A-Za-z0-9_-]{43})$/;
const stopCommand = /^\/stop(?:@[A-Za-z0-9_]+)?\s*$/;

export async function POST(request: Request) {
  const environment = getServerEnvironment();
  if (
    !environment.TELEGRAM_BOT_TOKEN ||
    !matchesSecret(
      request.headers.get("x-telegram-bot-api-secret-token"),
      environment.TELEGRAM_WEBHOOK_SECRET,
    )
  ) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 32_768) {
    return NextResponse.json({ success: false }, { status: 413 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
  const parsed = telegramUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false }, { status: 400 });
  }
  const message = parsed.data.message;
  if (!message?.text || message.chat.type !== "private") {
    return NextResponse.json({ success: true });
  }
  const provider = new TelegramProvider(environment.TELEGRAM_BOT_TOKEN);
  const start = startCommand.exec(message.text.trim());
  if (start) {
    try {
      await consumeTelegramLink(start[1], message.chat.id);
      await provider.deliver({
        destination: message.chat.id,
        message:
          "Telegram quedó vinculado con SCCVI. Puedes desvincularlo con /stop.",
      });
    } catch {
      await provider.deliver({
        destination: message.chat.id,
        message:
          "El enlace no es válido o expiró. Solicita uno nuevo en SCCVI.",
      });
    }
  } else if (stopCommand.test(message.text.trim())) {
    await unlinkTelegramByChat(message.chat.id);
    await provider.deliver({
      destination: message.chat.id,
      message: "Telegram fue desvinculado de SCCVI.",
    });
  }
  return NextResponse.json({ success: true });
}
