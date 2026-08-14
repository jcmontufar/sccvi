import { ApplicationError } from "@/lib/errors/application-error";

export function assertCredentialAvailable(
  credential: { revokedAt: Date | null; expiresAt: Date | null },
  currentInstant = new Date(),
) {
  if (credential.revokedAt) throw new ApplicationError("QR_TOKEN_REVOKED");
  if (credential.expiresAt && credential.expiresAt <= currentInstant) {
    throw new ApplicationError("QR_TOKEN_EXPIRED");
  }
}
