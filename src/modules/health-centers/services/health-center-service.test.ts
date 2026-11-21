import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { getSafeErrorMessage } from "@/lib/errors/application-error";
import type { ApplicationUser } from "@/modules/auth/types";
import { createHealthCenter } from "./health-center-service";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ $transaction: mocks.transaction }),
}));
vi.mock("@/modules/audit/services/audit-service", () => ({
  recordAuditEvent: mocks.audit,
}));
const actor: ApplicationUser = {
  id: "11111111-1111-4111-8111-111111111111",
  authUserId: "22222222-2222-4222-8222-222222222222",
  fullName: "Administradora ficticia",
  email: "admin@example.test",
  role: "ADMIN",
  isActive: true,
  healthCenterId: null,
};
const input = {
  name: "  Centro ficticio  ",
  code: " PRUEBA ",
  address: "Dirección ficticia",
  phone: "55550000",
  email: "centro@example.test",
};
const transaction = { healthCenter: { create: mocks.create } };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation((callback) => callback(transaction));
  mocks.create.mockResolvedValue({ id: "center-created", isActive: true });
});

describe("health center creation", () => {
  it("creates for ADMIN and audits identifiers without contact data in the same transaction", async () => {
    await expect(createHealthCenter(actor, input)).resolves.toMatchObject({
      id: "center-created",
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ...input, name: "Centro ficticio", code: "PRUEBA" },
      }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(transaction, {
      userId: actor.id,
      action: "HEALTH_CENTER_CREATED",
      entityType: "HealthCenter",
      entityId: "center-created",
    });
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain(input.email);
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain(input.phone);
  });
  it.each(["HEALTH_STAFF", "CENTER_MANAGER", "GUARDIAN"] as const)(
    "rejects %s before accessing persistence",
    async (role) => {
      await expect(
        createHealthCenter(
          { ...actor, role, healthCenterId: "another-center" },
          input,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );
  it("rejects inactive administrators", async () => {
    await expect(
      createHealthCenter({ ...actor, isActive: false }, input),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each([
    { name: " " },
    { name: "a" },
    { name: "x".repeat(121) },
    { code: "x".repeat(41) },
    { address: "x".repeat(241) },
    { phone: "x".repeat(41) },
    { email: "invalid" },
    { name: null },
  ])("rejects invalid external input %j", async (invalid) => {
    await expect(
      createHealthCenter(actor, { ...input, ...invalid }),
    ).rejects.toHaveProperty("name", "ZodError");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("normalizes empty optional values and ignores attempted assignment/state fields", async () => {
    await createHealthCenter(actor, {
      name: "Centro",
      code: " ",
      address: "",
      phone: "",
      email: "",
      healthCenterId: "untrusted",
      isActive: false,
      id: "untrusted",
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: "Centro",
          code: null,
          address: null,
          phone: null,
          email: null,
        },
      }),
    );
  });
  it("returns a safe duplicate-code error, including database races", async () => {
    mocks.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("private details", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    await expect(createHealthCenter(actor, input)).rejects.toMatchObject({
      code: "HEALTH_CENTER_DUPLICATE",
      message: "Ya existe un centro de salud con ese código.",
    });
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("propagates audit failure and never reports success", async () => {
    mocks.audit.mockRejectedValue(new Error("private audit failure"));
    await expect(createHealthCenter(actor, input)).rejects.toThrow(
      "private audit failure",
    );
    expect(
      getSafeErrorMessage(new Error("private audit failure")),
    ).not.toContain("private");
  });
});
