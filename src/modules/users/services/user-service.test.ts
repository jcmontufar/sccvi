import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationUser } from "@/modules/auth/types";
import {
  createUser,
  setUserActive,
  updateUser,
} from "@/modules/users/services/user-service";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => {
  const prisma = {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    guardian: { findUnique: vi.fn(), update: vi.fn() },
    healthCenter: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  return {
    prisma,
    invite: vi.fn(),
    deleteUser: vi.fn(),
    audit: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ getPrisma: () => mocks.prisma }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      admin: { inviteUserByEmail: mocks.invite, deleteUser: mocks.deleteUser },
    },
  }),
}));
vi.mock("@/lib/env/server-env", () => ({
  getServerEnvironment: () => ({ APP_URL: "https://sccvi.example.test" }),
}));
vi.mock("@/modules/audit/services/audit-service", () => ({
  recordAuditEvent: mocks.audit,
}));

const actor: ApplicationUser = {
  id: "11111111-1111-4111-8111-111111111111",
  authUserId: "22222222-2222-4222-8222-222222222222",
  healthCenterId: null,
  fullName: "Administrador de prueba",
  email: "admin@example.test",
  role: "ADMIN",
  isActive: true,
};
const centerId = "33333333-3333-4333-8333-333333333333";
const guardianId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const authUserId = "66666666-6666-4666-8666-666666666666";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.prisma.$transaction.mockImplementation((callback) =>
    callback(mocks.prisma),
  );
  mocks.prisma.user.findFirst.mockResolvedValue(null);
  mocks.prisma.user.create.mockResolvedValue({ id: userId });
  mocks.prisma.user.update.mockResolvedValue({
    id: userId,
    isActive: false,
    role: "HEALTH_STAFF",
  });
  mocks.prisma.healthCenter.findUnique.mockResolvedValue({ isActive: true });
  mocks.prisma.guardian.findUnique.mockResolvedValue({
    isActive: true,
    userId: null,
    community: { healthCenterId: centerId },
  });
  mocks.invite.mockResolvedValue({
    data: { user: { id: authUserId } },
    error: null,
  });
  mocks.deleteUser.mockResolvedValue({ error: null });
  mocks.audit.mockResolvedValue({ id: "audit" });
});

describe("RF-003 user administration", () => {
  it("rejects non-admin creation before contacting Supabase Auth", async () => {
    await expect(
      createUser(
        { ...actor, role: "HEALTH_STAFF" },
        {
          fullName: "Nuevo usuario",
          email: "new@example.test",
          role: "HEALTH_STAFF",
          healthCenterId: centerId,
          guardianId: "",
        },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.invite).not.toHaveBeenCalled();
  });

  it("invites a staff user and audits only non-sensitive metadata", async () => {
    await createUser(actor, {
      fullName: "Nuevo usuario",
      email: " New@Example.Test ",
      role: "HEALTH_STAFF",
      healthCenterId: centerId,
      guardianId: "",
    });
    expect(mocks.invite).toHaveBeenCalledWith("new@example.test", {
      redirectTo: "https://sccvi.example.test/aceptar-invitacion",
    });
    expect(mocks.prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authUserId,
          role: "HEALTH_STAFF",
          healthCenterId: centerId,
        }),
      }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      mocks.prisma,
      expect.objectContaining({
        action: "USER_CREATED",
        metadata: {
          role: "HEALTH_STAFF",
          healthCenterId: centerId,
          guardianId: null,
        },
      }),
    );
  });

  it("requires a real unlinked guardian and derives its center", async () => {
    await createUser(actor, {
      fullName: "Tutor de prueba",
      email: "tutor@example.test",
      role: "GUARDIAN",
      healthCenterId: "",
      guardianId,
    });
    expect(mocks.prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "GUARDIAN",
          healthCenterId: centerId,
        }),
      }),
    );
    expect(mocks.prisma.guardian.update).toHaveBeenCalledWith({
      where: { id: guardianId },
      data: { userId },
    });
    mocks.prisma.guardian.findUnique.mockResolvedValue({
      isActive: true,
      userId: "other",
      community: { healthCenterId: centerId },
    });
    await expect(
      createUser(actor, {
        fullName: "Otro tutor",
        email: "otro@example.test",
        role: "GUARDIAN",
        healthCenterId: "",
        guardianId,
      }),
    ).rejects.toMatchObject({ code: "GUARDIAN_NOT_FOUND" });
    expect(mocks.invite).toHaveBeenCalledTimes(1);
  });

  it("compensates a newly invited Auth identity when the database audit fails", async () => {
    mocks.audit.mockRejectedValue(new Error("audit failed"));
    await expect(
      createUser(actor, {
        fullName: "Nuevo usuario",
        email: "new@example.test",
        role: "HEALTH_STAFF",
        healthCenterId: centerId,
        guardianId: "",
      }),
    ).rejects.toMatchObject({ code: "USER_PROVISIONING_FAILED" });
    expect(mocks.deleteUser).toHaveBeenCalledWith(authUserId);
  });

  it("flags manual recovery when the compensation cannot remove the new identity", async () => {
    mocks.audit.mockRejectedValue(new Error("audit failed"));
    mocks.deleteUser.mockResolvedValue({
      error: new Error("provider unavailable"),
    });
    await expect(
      createUser(actor, {
        fullName: "Nuevo usuario",
        email: "new@example.test",
        role: "HEALTH_STAFF",
        healthCenterId: centerId,
        guardianId: "",
      }),
    ).rejects.toMatchObject({ code: "USER_PROVISIONING_RECOVERY_REQUIRED" });
  });

  it("rejects a supplied center that differs from the selected guardian's center", async () => {
    await expect(
      createUser(actor, {
        fullName: "Tutor de prueba",
        email: "tutor@example.test",
        role: "GUARDIAN",
        healthCenterId: "77777777-7777-4777-8777-777777777777",
        guardianId,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.invite).not.toHaveBeenCalled();
  });

  it("audits a role change and unlinks the previous guardian in one transaction", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: userId,
      role: "GUARDIAN",
      isActive: true,
      fullName: "Tutor de prueba",
      healthCenterId: centerId,
      guardian: { id: guardianId },
    });
    await updateUser(actor, userId, {
      fullName: "Personal de salud",
      role: "HEALTH_STAFF",
      healthCenterId: centerId,
      guardianId: "",
    });
    expect(mocks.prisma.guardian.update).toHaveBeenCalledWith({
      where: { id: guardianId },
      data: { userId: null },
    });
    expect(mocks.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          fullName: "Personal de salud",
          role: "HEALTH_STAFF",
          healthCenterId: centerId,
        },
      }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      mocks.prisma,
      expect.objectContaining({
        action: "USER_UPDATED",
        metadata: expect.objectContaining({
          role: "HEALTH_STAFF",
          guardianId: null,
        }),
      }),
    );
  });

  it("does not report an update as successful when audit persistence fails", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: userId,
      role: "HEALTH_STAFF",
      isActive: true,
      fullName: "Usuario ficticio",
      healthCenterId: centerId,
      guardian: null,
    });
    mocks.audit.mockRejectedValue(new Error("audit failed"));
    await expect(
      updateUser(actor, userId, {
        fullName: "Usuario actualizado",
        role: "HEALTH_STAFF",
        healthCenterId: centerId,
        guardianId: "",
      }),
    ).rejects.toThrow("audit failed");
    expect(mocks.prisma.$transaction).toHaveBeenCalled();
  });

  it("prevents self-demotion and deactivating the last administrator", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: actor.id,
      role: "ADMIN",
      isActive: true,
      fullName: actor.fullName,
      healthCenterId: null,
      guardian: null,
    });
    await expect(
      updateUser(actor, actor.id, {
        fullName: actor.fullName,
        role: "HEALTH_STAFF",
        healthCenterId: centerId,
        guardianId: "",
      }),
    ).rejects.toMatchObject({ code: "SELF_USER_CHANGE_FORBIDDEN" });

    mocks.prisma.user.findUnique.mockResolvedValue({
      role: "ADMIN",
      isActive: true,
    });
    mocks.prisma.user.count.mockResolvedValue(1);
    await expect(setUserActive(actor, userId, false)).rejects.toMatchObject({
      code: "LAST_ADMIN_REQUIRED",
    });
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("deactivates without deleting the Supabase Auth identity", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      role: "HEALTH_STAFF",
      isActive: true,
    });
    await setUserActive(actor, userId, false);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: { isActive: false },
      }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      mocks.prisma,
      expect.objectContaining({
        action: "USER_STATUS_CHANGED",
        metadata: { isActive: false },
      }),
    );
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
