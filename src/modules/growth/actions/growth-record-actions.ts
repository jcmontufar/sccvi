"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import {
  correctGrowthRecord,
  createGrowthRecord,
} from "@/modules/growth/services/growth-record-service";

export type GrowthFormState = { error?: string };

function inputFrom(formData: FormData) {
  return {
    measurementDate: formData.get("measurementDate"),
    weightKg: formData.get("weightKg"),
    heightCm: formData.get("heightCm"),
    measurementMethod: formData.get("measurementMethod"),
    nextFollowUpDate: formData.get("nextFollowUpDate"),
    notes: formData.get("notes"),
    correctionReason: formData.get("correctionReason"),
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

export async function createGrowthRecordAction(
  childId: string,
  _state: GrowthFormState,
  formData: FormData,
) {
  try {
    await createGrowthRecord(
      await requireApplicationUser(),
      childId,
      inputFrom(formData),
    );
    revalidatePath(`/app/ninos/${childId}/crecimiento`);
  } catch (error) {
    return errorState(error);
  }
  redirect(`/app/ninos/${childId}/crecimiento?registrada=1`);
}

export async function correctGrowthRecordAction(
  childId: string,
  recordId: string,
  _state: GrowthFormState,
  formData: FormData,
) {
  try {
    await correctGrowthRecord(
      await requireApplicationUser(),
      childId,
      recordId,
      inputFrom(formData),
    );
    revalidatePath(`/app/ninos/${childId}/crecimiento`);
  } catch (error) {
    return errorState(error);
  }
  redirect(`/app/ninos/${childId}/crecimiento?corregida=1`);
}
