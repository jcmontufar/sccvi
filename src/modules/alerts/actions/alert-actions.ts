"use server";

import { revalidatePath } from "next/cache";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import {
  resolveAlert,
  reviewAlert,
} from "@/modules/alerts/services/alert-service";

async function transition(id: string, action: "review" | "resolve") {
  try {
    const user = await requireApplicationUser();
    if (action === "review") await reviewAlert(user, id);
    else await resolveAlert(user, id);
    revalidatePath("/app/alertas");
    revalidatePath(`/app/alertas/${id}`);
    return {};
  } catch (error) {
    return { error: getSafeErrorMessage(error) };
  }
}

export const reviewAlertAction = async (id: string) => transition(id, "review");
export const resolveAlertAction = async (id: string) =>
  transition(id, "resolve");
