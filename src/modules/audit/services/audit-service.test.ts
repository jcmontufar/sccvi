import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let recordAuditEvent: typeof import("@/modules/audit/services/audit-service").recordAuditEvent;
let sanitizeAuditMetadata: typeof import("@/modules/audit/services/audit-service").sanitizeAuditMetadata;

beforeAll(async () => {
  ({ recordAuditEvent, sanitizeAuditMetadata } =
    await import("@/modules/audit/services/audit-service"));
});

describe("audit service", () => {
  it("writes the expected typed critical event", async () => {
    const create = vi.fn().mockResolvedValue({ id: "audit-1" });
    await recordAuditEvent(
      { auditLog: { create } } as unknown as Parameters<
        typeof recordAuditEvent
      >[0],
      {
        userId: "00000000-0000-4000-8000-000000000001",
        action: "CHILD_CREATED",
        entityType: "Child",
        entityId: "00000000-0000-4000-8000-000000000002",
        metadata: { communityId: "community-1" },
      },
    );

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CHILD_CREATED",
        entityType: "Child",
        metadata: { communityId: "community-1" },
      }),
    });
  });

  it("removes secret, token and PIN fields recursively", () => {
    const metadata = sanitizeAuditMetadata({
      childId: "child-1",
      pin: "not-retained",
      rawToken: "not-retained",
      nested: { apiKey: "not-retained", reason: "Corrección autorizada" },
    });
    expect(metadata).toEqual({
      childId: "child-1",
      nested: { reason: "Corrección autorizada" },
    });
    expect(JSON.stringify(metadata)).not.toContain("not-retained");
  });

  it("removes campaign contact and message content from metadata", () => {
    expect(
      sanitizeAuditMetadata({
        recipientCount: 2,
        doseCode: "BCG-BIRTH",
        emailAddress: "not-retained",
        subject: "not-retained",
        messageBody: "not-retained",
      }),
    ).toEqual({ recipientCount: 2, doseCode: "BCG-BIRTH" });
  });

  it("propagates persistence failure for transactional rollback", async () => {
    const failure = new Error("audit unavailable");
    const create = vi.fn().mockRejectedValue(failure);
    await expect(
      recordAuditEvent(
        { auditLog: { create } } as unknown as Parameters<
          typeof recordAuditEvent
        >[0],
        {
          action: "QR_REVOKED",
          entityType: "QRToken",
          entityId: "credential-1",
        },
      ),
    ).rejects.toBe(failure);
  });
});
