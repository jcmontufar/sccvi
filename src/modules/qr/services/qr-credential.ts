import { ApplicationError } from "@/lib/errors/application-error";
import { qrOpaqueTokenSchema } from "@/modules/qr/schemas/qr-schema";

export function parseOpaqueQrToken(rawToken: string) {
  const result = qrOpaqueTokenSchema.safeParse(rawToken);
  if (!result.success) throw new ApplicationError("QR_TOKEN_INVALID");
  return result.data;
}

export function assertCredentialAvailable(
  credential: { revokedAt: Date | null; expiresAt: Date | null },
  currentInstant = new Date(),
) {
  if (credential.revokedAt) throw new ApplicationError("QR_TOKEN_REVOKED");
  if (credential.expiresAt && credential.expiresAt <= currentInstant) {
    throw new ApplicationError("QR_TOKEN_EXPIRED");
  }
}
