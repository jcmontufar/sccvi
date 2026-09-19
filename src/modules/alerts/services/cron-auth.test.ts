import { describe, expect, it } from "vitest";

import {
  isAuthorizedCronRequest,
  isCronSecretConfigured,
} from "@/modules/alerts/services/cron-auth";

describe("cron alert job authentication", () => {
  const secret = "fixture-secret-at-least-16-characters";

  it("fails closed when the secret is absent or too short", () => {
    expect(isCronSecretConfigured(undefined)).toBe(false);
    expect(isCronSecretConfigured("short")).toBe(false);
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, undefined)).toBe(false);
  });

  it("rejects missing and incorrect authorization", () => {
    expect(isAuthorizedCronRequest(null, secret)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer incorrect-secret", secret)).toBe(
      false,
    );
  });

  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, secret)).toBe(true);
  });
});
