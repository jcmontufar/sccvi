"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import {
  associateGuardian,
  createChild,
  setChildActive,
  updateChild,
} from "@/modules/children/services/child-service";

export type ChildFormState = { error?: string };

function inputFrom(formData: FormData) {
  return {
    communityId: formData.get("communityId"),
    fullName: formData.get("fullName"),
    dateOfBirth: formData.get("dateOfBirth"),
    sex: formData.get("sex"),
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

export async function createChildAction(
  _state: ChildFormState,
  formData: FormData,
) {
  let id: string;
  try {
    const child = await createChild(
      await requireApplicationUser(),
      inputFrom(formData),
    );
    id = child.id;
  } catch (error) {
    return errorState(error);
  }
  redirect(`/app/ninos/${id}?creado=1`);
}

export async function updateChildAction(
  id: string,
  _state: ChildFormState,
  formData: FormData,
) {
  try {
    await updateChild(await requireApplicationUser(), id, inputFrom(formData));
    revalidatePath(`/app/ninos/${id}`);
  } catch (error) {
    return errorState(error);
  }
  redirect(`/app/ninos/${id}?actualizado=1`);
}

export async function setChildActiveAction(id: string, isActive: boolean) {
  try {
    await setChildActive(await requireApplicationUser(), id, isActive);
    revalidatePath("/app/ninos");
    return {};
  } catch (error) {
    return { error: getSafeErrorMessage(error) };
  }
}

export async function associateGuardianAction(
  id: string,
  _state: ChildFormState,
  formData: FormData,
): Promise<ChildFormState> {
  try {
    await associateGuardian(await requireApplicationUser(), id, {
      guardianId: formData.get("guardianId"),
      relationshipType: formData.get("relationshipType"),
      isPrimary: formData.get("isPrimary") === "on",
    });
    revalidatePath(`/app/ninos/${id}`);
    return {};
  } catch (error) {
    return errorState(error);
  }
}
