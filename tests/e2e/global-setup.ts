import { requireE2EEnvironment } from "../support/test-environment";

export default async function globalSetup() {
  await requireE2EEnvironment();
}
