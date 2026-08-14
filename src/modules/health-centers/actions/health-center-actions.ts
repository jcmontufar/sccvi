"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import {
  setHealthCenterActive,
  updateHealthCenter,
} from "@/modules/health-centers/services/health-center-service";

export type HealthCenterFormState = { error?: string };

export async function updateHealthCenterAction(
  id: string,
  _state: HealthCenterFormState,
  formData: FormData,
): Promise<HealthCenterFormState> {
  try {
    const user = await requireApplicationUser();
    await updateHealthCenter(user, id, {
      name: formData.get("name"),
      code: formData.get("code"),
      address: formData.get("address"),
      phone: formData.get("phone"),
      email: formData.get("email"),
    });
  } catch (error) {
    return {
      error:
        error instanceof ZodError
          ? error.issues[0]?.message
          : getSafeErrorMessage(error),
    };
  }

  revalidatePath("/app/centros-de-salud");
  redirect(`/app/centros-de-salud/${id}?actualizado=1`);
}

export async function setHealthCenterActiveAction(
  id: string,
  isActive: boolean,
) {
  try {
    const user = await requireApplicationUser();
    await setHealthCenterActive(user, id, isActive);
    revalidatePath("/app/centros-de-salud");
    return {};
  } catch (error) {
    return { error: getSafeErrorMessage(error) };
  }
}
