import { timingSafeEqual } from "node:crypto";

export function isCronSecretConfigured(secret: string | undefined) {
  return Boolean(secret && secret.length >= 16);
}

export function isAuthorizedCronRequest(
  authorization: string | null,
  secret: string | undefined,
) {
  if (!isCronSecretConfigured(secret) || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
