"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import { createVaccination } from "@/modules/vaccination/services/vaccination-service";

export type VaccinationFormState = { error?: string };

export async function createVaccinationAction(
  childId: string,
  _state: VaccinationFormState,
  formData: FormData,
) {
  try {
    await createVaccination(await requireApplicationUser(), {
      childId,
      vaccineScheduleId: formData.get("vaccineScheduleId"),
      applicationDate: formData.get("applicationDate"),
      notes: formData.get("notes"),
    });
  } catch (error) {
    return {
      error:
        error instanceof ZodError
          ? error.issues[0]?.message
          : getSafeErrorMessage(error),
    };
  }
  revalidatePath(`/app/ninos/${childId}/vacunacion`);
  redirect(`/app/ninos/${childId}/vacunacion?registrada=1`);
}
