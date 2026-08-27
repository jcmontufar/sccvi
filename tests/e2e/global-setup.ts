import { requireE2EEnvironment } from "../support/test-environment";
import { provisionQrE2EFixtures } from "../support/qr-e2e-fixtures";
import { provisionCampaignE2EFixture } from "../support/campaign-e2e-fixture";

export default async function globalSetup() {
  await requireE2EEnvironment();
  const cleanupCampaign = await provisionCampaignE2EFixture();
  const cleanupQr = await provisionQrE2EFixtures();
  return async () => {
    await cleanupQr();
    await cleanupCampaign();
  };
}
