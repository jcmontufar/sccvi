import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import {
  childAccessResource,
  getChild,
} from "@/modules/children/services/child-service";
import {
  qrOpaqueTokenSchema,
  qrPinSchema,
  qrTokenInputSchema,
} from "@/modules/qr/schemas/qr-schema";
import { assertCredentialAvailable } from "@/modules/qr/services/qr-credential";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  hashPin,
  verifyPin,
} from "@/modules/qr/services/qr-crypto";

export async function listChildCredentials(
  user: ApplicationUser,
  childId: string,
) {
  const child = await getChild(user, childId);
  authorize(user, "qr:manage", childAccessResource(child));
  return getPrisma().qRToken.findMany({
    where: { childId: child.id },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      pinHash: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function generateChildCredential(
  user: ApplicationUser,
  childId: string,
  input: unknown,
) {
  const child = await getChild(user, childId);
  authorize(user, "qr:manage", childAccessResource(child));
  const data = qrTokenInputSchema.parse(input);
  if (data.expiresAt && data.expiresAt <= new Date())
    throw new ApplicationError("VALIDATION_ERROR");
  const rawToken = generateOpaqueToken();
  const pinHash = data.pin ? await hashPin(data.pin) : null;
  const credential = await getPrisma().$transaction(async (transaction) => {
    const created = await transaction.qRToken.create({
      data: {
        childId: child.id,
        createdByUserId: user.id,
        tokenHash: hashOpaqueToken(rawToken),
        pinHash,
        expiresAt: data.expiresAt,
      },
      select: { id: true },
    });
    await transaction.auditLog.create({
      data: {
        userId: user.id,
        action: "QR_GENERATED",
        entityType: "QRToken",
        entityId: created.id,
      },
    });
    return created;
  });
  return { ...credential, rawToken };
}

export async function revokeChildCredential(
  user: ApplicationUser,
  childId: string,
  credentialId: string,
) {
  const child = await getChild(user, childId);
  authorize(user, "qr:manage", childAccessResource(child));
  const credential = await getPrisma().qRToken.findFirst({
    where: { id: credentialId, childId: child.id },
    select: { id: true },
  });
  if (!credential) throw new ApplicationError("QR_TOKEN_INVALID");
  return getPrisma().$transaction(async (transaction) => {
    const revoked = await transaction.qRToken.update({
      where: { id: credential.id },
      data: { revokedAt: new Date() },
    });
    await transaction.auditLog.create({
      data: {
        userId: user.id,
        action: "QR_REVOKED",
        entityType: "QRToken",
        entityId: credential.id,
      },
    });
    return revoked;
  });
}

export async function accessDigitalCard(rawToken: string, pinValue?: string) {
  const token = qrOpaqueTokenSchema.parse(rawToken);
  const credential = await getPrisma().qRToken.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: {
      child: {
        select: {
          fullName: true,
          dateOfBirth: true,
          sex: true,
          isActive: true,
        },
      },
    },
  });
  if (!credential) throw new ApplicationError("QR_TOKEN_INVALID");
  assertCredentialAvailable(credential);
  if (!credential.child.isActive)
    throw new ApplicationError("QR_TOKEN_INVALID");
  if (credential.pinHash) {
    if (!pinValue) throw new ApplicationError("QR_PIN_REQUIRED");
    const pin = qrPinSchema.parse(pinValue);
    if (!(await verifyPin(pin, credential.pinHash)))
      throw new ApplicationError("QR_PIN_INVALID");
  }
  await getPrisma().qRToken.update({
    where: { id: credential.id },
    data: { lastUsedAt: new Date() },
  });
  return credential.child;
}
