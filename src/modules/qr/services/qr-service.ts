import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import {
  childAccessResource,
  getChild,
} from "@/modules/children/services/child-service";
import {
  qrCredentialIdSchema,
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
import {
  isPinAttemptLocked,
  nextFailedPinAttemptState,
  resetPinAttemptState,
} from "@/modules/qr/services/qr-pin-throttle";
import {
  DIGITAL_CARD_GROWTH_RECORD_LIMIT,
  toDigitalCardData,
} from "@/modules/qr/services/digital-card";

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
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "QR_GENERATED",
      entityType: "QRToken",
      entityId: created.id,
      metadata: {
        childId: child.id,
        accessProtectionEnabled: Boolean(pinHash),
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
  const parsedCredentialId = qrCredentialIdSchema.parse(credentialId);
  const credential = await getPrisma().qRToken.findFirst({
    where: { id: parsedCredentialId, childId: child.id },
    select: { id: true },
  });
  if (!credential) throw new ApplicationError("QR_TOKEN_INVALID");
  return getPrisma().$transaction(async (transaction) => {
    const revoked = await transaction.qRToken.update({
      where: { id: credential.id },
      data: { revokedAt: new Date() },
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "QR_REVOKED",
      entityType: "QRToken",
      entityId: credential.id,
      metadata: { childId: child.id },
    });
    return revoked;
  });
}

export async function accessDigitalCard(
  rawToken: string,
  pinValue?: string,
  currentInstant = new Date(),
) {
  const token = qrOpaqueTokenSchema.parse(rawToken);
  const tokenHash = hashOpaqueToken(token);
  const result = await getPrisma().$transaction(async (transaction) => {
    const candidate = await transaction.qRToken.findUnique({
      where: { tokenHash },
      select: { id: true },
    });
    if (!candidate) throw new ApplicationError("QR_TOKEN_INVALID");

    await transaction.$queryRaw`
      SELECT "id"
      FROM "QRToken"
      WHERE "id" = ${candidate.id}::uuid
      FOR UPDATE
    `;
    const credential = await transaction.qRToken.findUnique({
      where: { id: candidate.id },
      include: {
        child: {
          select: {
            fullName: true,
            dateOfBirth: true,
            sex: true,
            isActive: true,
            vaccinations: {
              select: {
                applicationDate: true,
                vaccineSchedule: {
                  select: {
                    doseName: true,
                    doseNumber: true,
                    vaccine: { select: { name: true } },
                  },
                },
              },
              orderBy: { applicationDate: "desc" },
            },
            growthRecords: {
              select: {
                measurementDate: true,
                weightKg: true,
                heightCm: true,
              },
              orderBy: [{ measurementDate: "desc" }, { createdAt: "desc" }],
              take: DIGITAL_CARD_GROWTH_RECORD_LIMIT,
            },
          },
        },
      },
    });
    if (!credential) throw new ApplicationError("QR_TOKEN_INVALID");
    assertCredentialAvailable(credential, currentInstant);
    if (!credential.child.isActive)
      throw new ApplicationError("QR_TOKEN_INVALID");

    if (!credential.pinHash) {
      await transaction.qRToken.update({
        where: { id: credential.id },
        data: { lastUsedAt: currentInstant },
      });
      return {
        status: "granted" as const,
        child: toDigitalCardData(credential.child),
      };
    }
    if (!pinValue) throw new ApplicationError("QR_PIN_REQUIRED");
    if (isPinAttemptLocked(credential, currentInstant)) {
      return { status: "denied" as const };
    }

    const parsedPin = qrPinSchema.safeParse(pinValue);
    const pinMatches =
      parsedPin.success &&
      (await verifyPin(parsedPin.data, credential.pinHash));
    if (!pinMatches) {
      await transaction.qRToken.update({
        where: { id: credential.id },
        data: nextFailedPinAttemptState(credential, currentInstant),
      });
      return { status: "denied" as const };
    }

    await transaction.qRToken.update({
      where: { id: credential.id },
      data: { ...resetPinAttemptState(), lastUsedAt: currentInstant },
    });
    return {
      status: "granted" as const,
      child: toDigitalCardData(credential.child),
    };
  });
  if (result.status === "denied") {
    throw new ApplicationError("QR_ACCESS_DENIED");
  }
  return result.child;
}
