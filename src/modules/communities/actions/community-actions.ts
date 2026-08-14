"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import { communityService } from "@/modules/communities/queries/prisma-community-repository";

export type CommunityFormState = { error?: string };

function inputFrom(formData: FormData) {
  return {
    healthCenterId: formData.get("healthCenterId"),
    name: formData.get("name"),
    location: formData.get("location"),
    estimatedFamilies: formData.get("estimatedFamilies"),
  };
}

function errorState(error: unknown): CommunityFormState {
  return {
    error:
      error instanceof ZodError
        ? error.issues[0]?.message
        : getSafeErrorMessage(error),
  };
}

export async function createCommunityAction(
  _state: CommunityFormState,
  formData: FormData,
): Promise<CommunityFormState> {
  try {
    const user = await requireApplicationUser();
    await communityService.create(user, inputFrom(formData));
  } catch (error) {
    return errorState(error);
  }
  revalidatePath("/app/comunidades");
  redirect("/app/comunidades?creada=1");
}

export async function updateCommunityAction(
  id: string,
  _state: CommunityFormState,
  formData: FormData,
): Promise<CommunityFormState> {
  try {
    const user = await requireApplicationUser();
    await communityService.update(user, id, inputFrom(formData));
  } catch (error) {
    return errorState(error);
  }
  revalidatePath("/app/comunidades");
  redirect("/app/comunidades?actualizada=1");
}

export async function setCommunityActiveAction(id: string, isActive: boolean) {
  try {
    const user = await requireApplicationUser();
    await communityService.setActive(user, id, isActive);
    revalidatePath("/app/comunidades");
    return {};
  } catch (error) {
    return { error: getSafeErrorMessage(error) };
  }
}
