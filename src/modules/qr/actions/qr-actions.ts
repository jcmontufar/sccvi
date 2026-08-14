"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import {
  accessDigitalCard,
  generateChildCredential,
  revokeChildCredential,
} from "@/modules/qr/services/qr-service";

export type QRFormState = { error?: string; rawToken?: string };

export async function generateCredentialAction(
  childId: string,
  _state: QRFormState,
  formData: FormData,
): Promise<QRFormState> {
  try {
    const expiration = formData.get("expiresAt");
    const credential = await generateChildCredential(
      await requireApplicationUser(),
      childId,
      {
        expiresAt: expiration
          ? new Date(`${expiration}T23:59:59-06:00`).toISOString()
          : "",
        pin: formData.get("pin"),
      },
    );
    revalidatePath(`/app/ninos/${childId}/tarjeta`);
    return { rawToken: credential.rawToken };
  } catch (error) {
    return {
      error:
        error instanceof ZodError
          ? error.issues[0]?.message
          : getSafeErrorMessage(error),
    };
  }
}

export async function revokeCredentialAction(
  childId: string,
  credentialId: string,
) {
  try {
    await revokeChildCredential(
      await requireApplicationUser(),
      childId,
      credentialId,
    );
    revalidatePath(`/app/ninos/${childId}/tarjeta`);
    return {};
  } catch (error) {
    return { error: getSafeErrorMessage(error) };
  }
}

export async function accessDigitalCardAction(
  rawToken: string,
  _state: DigitalCardState,
  formData: FormData,
): Promise<DigitalCardState> {
  try {
    const child = await accessDigitalCard(
      rawToken,
      String(formData.get("pin") ?? ""),
    );
    return {
      child: {
        fullName: child.fullName,
        dateOfBirth: child.dateOfBirth.toISOString().slice(0, 10),
        sex: child.sex,
      },
    };
  } catch (error) {
    return { error: getSafeErrorMessage(error) };
  }
}

export type DigitalCardState = {
  error?: string;
  child?: { fullName: string; dateOfBirth: string; sex: "MALE" | "FEMALE" };
};
