import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let deriveCampaignResult: typeof import("@/modules/campaigns/services/campaign-service").deriveCampaignResult;
let isCampaignDeliveryEligible: typeof import("@/modules/campaigns/services/campaign-service").isCampaignDeliveryEligible;
let resolveCampaignDeliveryRecipient: typeof import("@/modules/campaigns/services/campaign-service").resolveCampaignDeliveryRecipient;

beforeAll(async () => {
  ({
    deriveCampaignResult,
    isCampaignDeliveryEligible,
    resolveCampaignDeliveryRecipient,
  } = await import("@/modules/campaigns/services/campaign-service"));
});

const eligible = {
  guardianActive: true,
  email: "guardian@example.test",
  preferredChannel: "EMAIL",
  guardianHealthCenterId: "center-a",
  campaignHealthCenterId: "center-a",
  senderRole: "CENTER_MANAGER" as const,
};

describe("campaign delivery policy", () => {
  it("accepts only an active, contactable, EMAIL-enabled in-scope guardian", () => {
    expect(isCampaignDeliveryEligible(eligible)).toBe(true);
    expect(
      isCampaignDeliveryEligible({ ...eligible, guardianActive: false }),
    ).toBe(false);
    expect(isCampaignDeliveryEligible({ ...eligible, email: null })).toBe(
      false,
    );
    expect(
      isCampaignDeliveryEligible({ ...eligible, preferredChannel: "WHATSAPP" }),
    ).toBe(false);
    expect(
      isCampaignDeliveryEligible({
        ...eligible,
        guardianHealthCenterId: "center-b",
      }),
    ).toBe(false);
  });

  it("routes a campaign to Telegram only when the preferred channel is linked", () => {
    expect(
      resolveCampaignDeliveryRecipient({
        ...eligible,
        preferredChannel: "TELEGRAM",
        telegramChatId: "12345",
        telegramRevokedAt: null,
      }),
    ).toMatchObject({ channel: "TELEGRAM", destination: "12345" });
    expect(
      resolveCampaignDeliveryRecipient({
        ...eligible,
        preferredChannel: "TELEGRAM",
        telegramChatId: null,
      }),
    ).toBeNull();
  });

  it("maps provider outcomes to aggregate campaign status", () => {
    expect(deriveCampaignResult(["SENT", "SKIPPED"])).toEqual({
      summary: { PENDING: 0, SENT: 1, FAILED: 0, SKIPPED: 1 },
      status: "COMPLETED",
    });
    expect(deriveCampaignResult(["SENT", "FAILED"]).status).toBe("FAILED");
  });
});
