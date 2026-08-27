"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  sendCampaignAction,
  type CampaignFormState,
} from "@/modules/campaigns/actions/campaign-actions";

export function CampaignSendButton({ campaignId }: { campaignId: string }) {
  const [state, action, pending] = useActionState<CampaignFormState, FormData>(
    sendCampaignAction,
    {},
  );
  return (
    <form action={action} className="space-y-2">
      <input name="campaignId" type="hidden" value={campaignId} />
      <Button disabled={pending} type="submit">
        {pending ? "Enviando…" : "Iniciar envío"}
      </Button>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}
