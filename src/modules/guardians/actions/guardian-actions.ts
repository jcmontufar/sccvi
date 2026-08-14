"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import {
  createGuardian,
  setGuardianActive,
  updateGuardian,
} from "@/modules/guardians/services/guardian-service";

export type GuardianFormState = { error?: string };

function inputFrom(formData: FormData) {
  return {
    communityId: formData.get("communityId"),
    fullName: formData.get("fullName"),
    identification: formData.get("identification"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    preferredNotificationChannel: formData.get("preferredNotificationChannel"),
  };
}

function errorState(error: unknown) {
  return {
    error:
      error instanceof ZodError
        ? error.issues[0]?.message
        : getSafeErrorMessage(error),
  };
}

export async function createGuardianAction(
  _state: GuardianFormState,
  formData: FormData,
) {
  let guardianId: string;
  try {
    const user = await requireApplicationUser();
    const guardian = await createGuardian(user, inputFrom(formData));
    guardianId = guardian.id;
  } catch (error) {
    return errorState(error);
  }
  redirect(`/app/tutores/${guardianId}?creado=1`);
}

export async function updateGuardianAction(
  id: string,
  _state: GuardianFormState,
  formData: FormData,
) {
  try {
    const user = await requireApplicationUser();
    await updateGuardian(user, id, inputFrom(formData));
    revalidatePath(`/app/tutores/${id}`);
  } catch (error) {
    return errorState(error);
  }
  redirect(`/app/tutores/${id}?actualizado=1`);
}

export async function setGuardianActiveAction(id: string, isActive: boolean) {
  try {
    const user = await requireApplicationUser();
    await setGuardianActive(user, id, isActive);
    revalidatePath("/app/tutores");
    return {};
  } catch (error) {
    return { error: getSafeErrorMessage(error) };
  }
}
