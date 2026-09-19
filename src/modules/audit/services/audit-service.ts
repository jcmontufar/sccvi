import "server-only";

import type { Prisma } from "@/generated/prisma/client";

export type AuditAction =
  | "USER_CREATED"
  | "CHILD_CREATED"
  | "CHILD_UPDATED"
  | "CHILD_STATUS_CHANGED"
  | "GROWTH_RECORD_CREATED"
  | "GROWTH_RECORD_CORRECTED"
  | "VACCINATION_CREATED"
  | "ALERT_REVIEWED"
  | "ALERT_RESOLVED"
  | "QR_GENERATED"
  | "QR_REVOKED"
  | "CAMPAIGN_CREATED"
  | "CAMPAIGN_SEND_STARTED"
  | "CAMPAIGN_COMPLETED"
  | "CAMPAIGN_FAILED"
  | "GUARDIAN_CREATED"
  | "GUARDIAN_UPDATED"
  | "GUARDIAN_STATUS_CHANGED"
  | "TELEGRAM_LINK_REQUESTED"
  | "TELEGRAM_LINKED"
  | "TELEGRAM_UNLINKED"
  | "CHILD_GUARDIAN_ASSOCIATED"
  | "VACCINE_CREATED"
  | "VACCINE_UPDATED"
  | "VACCINE_STATUS_CHANGED"
  | "HEALTH_CENTER_UPDATED"
  | "HEALTH_CENTER_STATUS_CHANGED"
  | "COMMUNITY_CREATED"
  | "COMMUNITY_UPDATED"
  | "COMMUNITY_STATUS_CHANGED";

export type AuditEntityType =
  | "User"
  | "Child"
  | "GrowthRecord"
  | "Vaccination"
  | "Alert"
  | "QRToken"
  | "Campaign"
  | "Guardian"
  | "ChildGuardian"
  | "Vaccine"
  | "HealthCenter"
  | "Community";

type AuditMetadataValue =
  | string
  | number
  | boolean
  | null
  | AuditMetadataValue[]
  | { [key: string]: AuditMetadataValue | undefined };

export type AuditEvent = {
  userId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, AuditMetadataValue | undefined>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AuditClient = Pick<Prisma.TransactionClient, "auditLog">;

const sensitiveKey =
  /password|passphrase|pin|token|secret|api[-_]?key|authorization|cookie|credential|email|destination|message|subject/i;

function sanitizeValue(
  value: AuditMetadataValue,
): Prisma.InputJsonValue | undefined {
  if (value === null) return undefined;
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const sanitized = sanitizeValue(item);
      return sanitized === undefined ? [] : [sanitized];
    });
  }
  if (typeof value === "object") {
    return sanitizeAuditMetadata(value);
  }
  return value;
}

export function sanitizeAuditMetadata(
  metadata: Record<string, AuditMetadataValue | undefined>,
): Prisma.InputJsonObject {
  return Object.fromEntries(
    Object.entries(metadata).flatMap(([key, value]) => {
      if (value === undefined || sensitiveKey.test(key)) return [];
      const sanitized = sanitizeValue(value);
      return sanitized === undefined ? [] : [[key, sanitized]];
    }),
  );
}

/**
 * Critical domain operations call this inside their database transaction.
 * A persistence failure is deliberately propagated so the operation rolls back
 * instead of succeeding without its required traceability.
 */
export async function recordAuditEvent(client: AuditClient, event: AuditEvent) {
  return client.auditLog.create({
    data: {
      userId: event.userId ?? null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: event.metadata
        ? sanitizeAuditMetadata(event.metadata)
        : undefined,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
    },
  });
}
