import { describe, expect, it } from "vitest";

import {
  assertCredentialAvailable,
  parseOpaqueQrToken,
} from "@/modules/qr/services/qr-credential";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  hashPin,
  verifyPin,
} from "@/modules/qr/services/qr-crypto";
import {
  isPinAttemptLocked,
  maximumFailedPinAttempts,
  nextFailedPinAttemptState,
  resetPinAttemptState,
} from "@/modules/qr/services/qr-pin-throttle";
import {
  qrCredentialIdSchema,
  qrPinSchema,
  qrTokenInputSchema,
} from "@/modules/qr/schemas/qr-schema";

describe("QR credential security", () => {
  it("generates opaque random tokens and deterministic hashes", () => {
    const first = generateOpaqueToken();
    const second = generateOpaqueToken();
    expect(first).toHaveLength(43);
    expect(first).not.toBe(second);
    expect(hashOpaqueToken(first)).toHaveLength(64);
    expect(hashOpaqueToken(first)).toBe(hashOpaqueToken(first));
  });

  it("hashes PINs with salt and verifies only the correct PIN", async () => {
    const firstHash = await hashPin("482619");
    const secondHash = await hashPin("482619");
    expect(firstHash).not.toBe(secondHash);
    expect(firstHash).not.toContain("482619");
    await expect(verifyPin("482619", firstHash)).resolves.toBe(true);
    await expect(verifyPin("000000", firstHash)).resolves.toBe(false);
  });

  it("rejects PINs shorter than six digits", () => {
    expect(qrPinSchema.safeParse("12345").success).toBe(false);
    expect(
      qrTokenInputSchema.safeParse({ expiresAt: "", pin: "12345" }).success,
    ).toBe(false);
  });

  it("rejects a malformed credential identifier before persistence access", () => {
    expect(qrCredentialIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });

  it("maps a malformed opaque token to the safe invalid credential error", () => {
    expect(() =>
      parseOpaqueQrToken("staging-invalid-token-that-does-not-exist"),
    ).toThrow("La credencial de la tarjeta digital no es válida.");
  });

  it("locks repeated failures after the configured limit", () => {
    const now = new Date("2026-08-14T12:00:00Z");
    let state = resetPinAttemptState();
    for (let attempt = 0; attempt < maximumFailedPinAttempts; attempt += 1) {
      state = nextFailedPinAttemptState(state, now);
    }
    expect(state.failedPinAttempts).toBe(maximumFailedPinAttempts);
    expect(isPinAttemptLocked(state, now)).toBe(true);
  });

  it("resets prior failures after successful PIN verification", async () => {
    const pinHash = await hashPin("482619");
    let state = nextFailedPinAttemptState(resetPinAttemptState());
    state = nextFailedPinAttemptState(state);
    expect(state.failedPinAttempts).toBe(2);
    await expect(verifyPin("482619", pinHash)).resolves.toBe(true);
    expect(resetPinAttemptState()).toEqual({
      failedPinAttempts: 0,
      pinLockedUntil: null,
    });
  });

  it("rejects revoked and expired credentials", () => {
    const now = new Date("2026-08-14T12:00:00Z");
    expect(() =>
      assertCredentialAvailable({ revokedAt: now, expiresAt: null }, now),
    ).toThrow("revocada");
    expect(() =>
      assertCredentialAvailable(
        { revokedAt: null, expiresAt: new Date("2026-08-14T11:59:59Z") },
        now,
      ),
    ).toThrow("expiró");
  });

  it("accepts an active credential", () => {
    expect(() =>
      assertCredentialAvailable(
        { revokedAt: null, expiresAt: new Date("2026-08-15T00:00:00Z") },
        new Date("2026-08-14T12:00:00Z"),
      ),
    ).not.toThrow();
  });
});
