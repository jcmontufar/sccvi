"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import {
  createUser,
  setUserActive,
  updateUser,
} from "@/modules/users/services/user-service";

export type UserFormState = { error?: string };

function inputFrom(formData: FormData) {
  return {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
    healthCenterId: formData.get("healthCenterId") ?? "",
    guardianId: formData.get("guardianId") ?? "",
  };
}

function errorState(error: unknown): UserFormState {
  return {
    error:
      error instanceof ZodError
        ? error.issues[0]?.message
        : getSafeErrorMessage(error),
  };
}

export async function createUserAction(
  _state: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  try {
    await createUser(await requireApplicationUser(), inputFrom(formData));
  } catch (error) {
    return errorState(error);
  }
  revalidatePath("/app/usuarios");
  redirect("/app/usuarios?creado=1");
}

export async function updateUserAction(
  id: string,
  _state: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  try {
    await updateUser(await requireApplicationUser(), id, inputFrom(formData));
  } catch (error) {
    return errorState(error);
  }
  revalidatePath("/app/usuarios");
  redirect(`/app/usuarios/${id}?actualizado=1`);
}

export async function setUserActiveAction(id: string, isActive: boolean) {
  try {
    await setUserActive(await requireApplicationUser(), id, isActive);
    revalidatePath("/app/usuarios");
    revalidatePath(`/app/usuarios/${id}`);
    return {};
  } catch (error) {
    return { error: getSafeErrorMessage(error) };
  }
}
