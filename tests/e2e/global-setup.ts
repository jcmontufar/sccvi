import { requireE2EEnvironment } from "../support/test-environment";
import { provisionQrE2EFixtures } from "../support/qr-e2e-fixtures";

export default async function globalSetup() {
  await requireE2EEnvironment();
  return provisionQrE2EFixtures();
}
