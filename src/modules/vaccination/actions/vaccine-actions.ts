"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import {
  createVaccine,
  setVaccineActive,
  updateVaccine,
} from "@/modules/vaccination/services/vaccine-service";

export type VaccineFormState = { error?: string };

function inputFrom(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
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

export async function createVaccineAction(
  _state: VaccineFormState,
  formData: FormData,
) {
  try {
    await createVaccine(await requireApplicationUser(), inputFrom(formData));
  } catch (error) {
    return errorState(error);
  }
  redirect("/app/vacunas?creada=1");
}

export async function updateVaccineAction(
  id: string,
  _state: VaccineFormState,
  formData: FormData,
) {
  try {
    await updateVaccine(
      await requireApplicationUser(),
      id,
      inputFrom(formData),
    );
  } catch (error) {
    return errorState(error);
  }
  redirect("/app/vacunas?actualizada=1");
}

export async function setVaccineActiveAction(id: string, isActive: boolean) {
  try {
    await setVaccineActive(await requireApplicationUser(), id, isActive);
    revalidatePath("/app/vacunas");
    return {};
  } catch (error) {
    return { error: getSafeErrorMessage(error) };
  }
}
