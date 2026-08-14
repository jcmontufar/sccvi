import { describe, expect, it } from "vitest";

import { assertCredentialAvailable } from "@/modules/qr/services/qr-credential";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  hashPin,
  verifyPin,
} from "@/modules/qr/services/qr-crypto";

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
    const firstHash = await hashPin("4826");
    const secondHash = await hashPin("4826");
    expect(firstHash).not.toBe(secondHash);
    expect(firstHash).not.toContain("4826");
    await expect(verifyPin("4826", firstHash)).resolves.toBe(true);
    await expect(verifyPin("0000", firstHash)).resolves.toBe(false);
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
