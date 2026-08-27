import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let deriveCampaignResult: typeof import("@/modules/campaigns/services/campaign-service").deriveCampaignResult;
let isCampaignDeliveryEligible: typeof import("@/modules/campaigns/services/campaign-service").isCampaignDeliveryEligible;

beforeAll(async () => {
  ({ deriveCampaignResult, isCampaignDeliveryEligible } =
    await import("@/modules/campaigns/services/campaign-service"));
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

  it("maps provider outcomes to aggregate campaign status", () => {
    expect(deriveCampaignResult(["SENT", "SKIPPED"])).toEqual({
      summary: { PENDING: 0, SENT: 1, FAILED: 0, SKIPPED: 1 },
      status: "COMPLETED",
    });
    expect(deriveCampaignResult(["SENT", "FAILED"]).status).toBe("FAILED");
  });
});
