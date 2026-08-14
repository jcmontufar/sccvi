"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { getSafeErrorMessage } from "@/lib/errors/application-error";
import { requireApplicationUser } from "@/modules/auth/session";
import { createCampaign } from "@/modules/campaigns/services/campaign-service";

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
