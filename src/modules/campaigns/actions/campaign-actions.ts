"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import { createCampaign } from "@/modules/campaigns/services/campaign-service";
import { sendCampaign } from "@/modules/campaigns/services/campaign-service";

export type CampaignFormState = { error?: string };

export async function createCampaignAction(
  _state: CampaignFormState,
  formData: FormData,
) {
  let id: string;
  try {
    const campaign = await createCampaign(await requireApplicationUser(), {
      name: formData.get("name"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      communityId: formData.get("communityId"),
      minimumAgeYears: formData.get("minimumAgeYears") || undefined,
      maximumAgeYears: formData.get("maximumAgeYears") || undefined,
      scheduleVersionCode: formData.get("scheduleVersionCode") || undefined,
      doseCode: formData.get("doseCode") || undefined,
      doseStatus: formData.get("doseStatus") || undefined,
    });
    id = campaign.id;
  } catch (error) {
    return {
      error:
        error instanceof ZodError
          ? error.issues[0]?.message
          : getSafeErrorMessage(error),
    };
  }
  redirect(`/app/campanas/${id}`);
}

export async function sendCampaignAction(
  _state: CampaignFormState,
  formData: FormData,
) {
  const value = formData.get("campaignId");
  const id = typeof value === "string" ? value : "";
  try {
    await sendCampaign(await requireApplicationUser(), id);
  } catch (error) {
    return {
      error:
        error instanceof ZodError
          ? error.issues[0]?.message
          : getSafeErrorMessage(error),
    };
  }
  redirect(`/app/campanas/${id}?enviada=1`);
}
