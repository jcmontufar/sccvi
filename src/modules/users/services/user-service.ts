import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ApplicationError } from "@/lib/errors/application-error";
import { getServerEnvironment } from "@/lib/env/server-env";
import { getPrisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import {
  createUserSchema,
  updateUserSchema,
  userIdSchema,
  userStatusSchema,
} from "@/modules/users/schemas/user-schema";

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  healthCenterId: true,
  isActive: true,
  createdAt: true,
  healthCenter: { select: { name: true } },
  guardian: { select: { id: true, fullName: true } },
} as const;

type Assignment = {
  role: "ADMIN" | "HEALTH_STAFF" | "CENTER_MANAGER" | "GUARDIAN";
  healthCenterId: string;
  guardianId: string;
};

async function resolveAssignment(
  client: Pick<Prisma.TransactionClient, "healthCenter" | "guardian">,
  input: Assignment,
  currentUserId?: string,
) {
  if (input.role === "ADMIN") {
    if (input.healthCenterId || input.guardianId)
      throw new ApplicationError("VALIDATION_ERROR");
    return { healthCenterId: null, guardianId: null };
  }
  if (input.role === "GUARDIAN") {
    if (!input.guardianId) throw new ApplicationError("VALIDATION_ERROR");
    const guardian = await client.guardian.findUnique({
      where: { id: input.guardianId },
      select: {
        isActive: true,
        userId: true,
        community: { select: { healthCenterId: true } },
      },
    });
    if (
      !guardian?.isActive ||
      (guardian.userId && guardian.userId !== currentUserId)
    )
      throw new ApplicationError("GUARDIAN_NOT_FOUND");
    if (
      input.healthCenterId &&
      input.healthCenterId !== guardian.community.healthCenterId
    )
      throw new ApplicationError("VALIDATION_ERROR");
    return {
      healthCenterId: guardian.community.healthCenterId,
      guardianId: input.guardianId,
    };
  }
  if (!input.healthCenterId || input.guardianId)
    throw new ApplicationError("VALIDATION_ERROR");
  const center = await client.healthCenter.findUnique({
    where: { id: input.healthCenterId },
    select: { isActive: true },
  });
  if (!center?.isActive) throw new ApplicationError("HEALTH_CENTER_NOT_FOUND");
  return { healthCenterId: input.healthCenterId, guardianId: null };
}

export async function listUsers(
  actor: ApplicationUser,
  filters: { search?: string; status?: string; page?: number } = {},
) {
  authorize(actor, "user:list");
  const page = Number.isFinite(filters.page)
    ? Math.max(1, Math.floor(filters.page ?? 1))
    : 1;
  const search = filters.search?.trim().slice(0, 120);
  const where: Prisma.UserWhereInput = {
    isActive:
      filters.status === "inactive"
        ? false
        : filters.status === "all"
          ? undefined
          : true,
    OR: search
      ? [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  };
  const [items, total] = await Promise.all([
    getPrisma().user.findMany({
      where,
      select: userSelect,
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      skip: (page - 1) * 25,
      take: 25,
    }),
    getPrisma().user.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / 25)) };
}

export async function getUser(actor: ApplicationUser, id: string) {
  authorize(actor, "user:read");
  const user = await getPrisma().user.findUnique({
    where: { id: userIdSchema.parse(id) },
    select: userSelect,
  });
  if (!user) throw new ApplicationError("USER_NOT_FOUND");
  return user;
}

export async function listAvailableGuardians(
  actor: ApplicationUser,
  userId?: string,
) {
  authorize(actor, "user:create");
  return getPrisma().guardian.findMany({
    where: {
      isActive: true,
      OR: [{ userId: null }, ...(userId ? [{ userId }] : [])],
    },
    select: {
      id: true,
      fullName: true,
      community: { select: { name: true, healthCenterId: true } },
    },
    orderBy: { fullName: "asc" },
  });
}

export async function createUser(actor: ApplicationUser, input: unknown) {
  authorize(actor, "user:create");
  const data = createUserSchema.parse(input);
  const prisma = getPrisma();
  await resolveAssignment(prisma, data);
  const duplicate = await prisma.user.findFirst({
    where: { email: { equals: data.email, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) throw new ApplicationError("USER_DUPLICATE");

  const supabase = createSupabaseAdminClient();
  const appUrl = getServerEnvironment().APP_URL;
  if (!appUrl) throw new ApplicationError("USER_PROVISIONING_UNAVAILABLE");
  const invitation = await supabase.auth.admin.inviteUserByEmail(data.email, {
    redirectTo: new URL("/aceptar-invitacion", appUrl).toString(),
  });
  if (invitation.error || !invitation.data.user)
    throw new ApplicationError("USER_PROVISIONING_FAILED");
  const authUserId = invitation.data.user.id;

  try {
    return await prisma.$transaction(async (transaction) => {
      const assignment = await resolveAssignment(transaction, data);
      const user = await transaction.user.create({
        data: {
          authUserId,
          fullName: data.fullName,
          email: data.email,
          role: data.role,
          healthCenterId: assignment.healthCenterId,
        },
        select: userSelect,
      });
      if (assignment.guardianId) {
        await transaction.guardian.update({
          where: { id: assignment.guardianId },
          data: { userId: user.id },
        });
      }
      await recordAuditEvent(transaction, {
        userId: actor.id,
        action: "USER_CREATED",
        entityType: "User",
        entityId: user.id,
        metadata: {
          role: data.role,
          healthCenterId: assignment.healthCenterId,
          guardianId: assignment.guardianId,
        },
      });
      return user;
    });
  } catch {
    // Compensate only the identity created by this invitation. No credential is logged.
    try {
      const cleanup = await supabase.auth.admin.deleteUser(authUserId);
      if (cleanup.error)
        throw new ApplicationError("USER_PROVISIONING_RECOVERY_REQUIRED");
    } catch {
      throw new ApplicationError("USER_PROVISIONING_RECOVERY_REQUIRED");
    }
    throw new ApplicationError("USER_PROVISIONING_FAILED");
  }
}

export async function updateUser(
  actor: ApplicationUser,
  id: string,
  input: unknown,
) {
  authorize(actor, "user:update");
  const userId = userIdSchema.parse(id);
  const data = updateUserSchema.parse(input);
  return getPrisma().$transaction(
    async (transaction) => {
      const existing = await transaction.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          isActive: true,
          healthCenterId: true,
          fullName: true,
          guardian: { select: { id: true } },
        },
      });
      if (!existing) throw new ApplicationError("USER_NOT_FOUND");
      const assignment = await resolveAssignment(transaction, data, userId);
      if (
        actor.id === userId &&
        (data.role !== existing.role ||
          assignment.healthCenterId !== existing.healthCenterId ||
          assignment.guardianId !== existing.guardian?.id)
      )
        throw new ApplicationError("SELF_USER_CHANGE_FORBIDDEN");
      if (
        existing.role === "ADMIN" &&
        existing.isActive &&
        data.role !== "ADMIN"
      ) {
        const activeAdmins = await transaction.user.count({
          where: { role: "ADMIN", isActive: true },
        });
        if (activeAdmins <= 1)
          throw new ApplicationError("LAST_ADMIN_REQUIRED");
      }
      if (
        existing.guardian?.id &&
        existing.guardian.id !== assignment.guardianId
      ) {
        await transaction.guardian.update({
          where: { id: existing.guardian.id },
          data: { userId: null },
        });
      }
      const user = await transaction.user.update({
        where: { id: userId },
        data: {
          fullName: data.fullName,
          role: data.role,
          healthCenterId: assignment.healthCenterId,
        },
        select: userSelect,
      });
      if (
        assignment.guardianId &&
        assignment.guardianId !== existing.guardian?.id
      ) {
        await transaction.guardian.update({
          where: { id: assignment.guardianId },
          data: { userId },
        });
      }
      const changedFields = [
        existing.fullName !== data.fullName ? "fullName" : null,
        existing.role !== data.role ? "role" : null,
        existing.healthCenterId !== assignment.healthCenterId
          ? "healthCenterId"
          : null,
        existing.guardian?.id !== assignment.guardianId ? "guardianId" : null,
      ].filter((field): field is string => Boolean(field));
      await recordAuditEvent(transaction, {
        userId: actor.id,
        action: "USER_UPDATED",
        entityType: "User",
        entityId: userId,
        metadata: {
          changedFields,
          role: data.role,
          healthCenterId: assignment.healthCenterId,
          guardianId: assignment.guardianId,
        },
      });
      return user;
    },
    { isolationLevel: "Serializable" },
  );
}

export async function setUserActive(
  actor: ApplicationUser,
  id: string,
  input: unknown,
) {
  authorize(actor, "user:change-status");
  const userId = userIdSchema.parse(id);
  const isActive = userStatusSchema.parse(input);
  if (actor.id === userId && !isActive)
    throw new ApplicationError("SELF_USER_CHANGE_FORBIDDEN");
  return getPrisma().$transaction(
    async (transaction) => {
      const existing = await transaction.user.findUnique({
        where: { id: userId },
        select: { role: true, isActive: true },
      });
      if (!existing) throw new ApplicationError("USER_NOT_FOUND");
      if (existing.isActive === isActive) return existing;
      if (existing.role === "ADMIN" && existing.isActive && !isActive) {
        const activeAdmins = await transaction.user.count({
          where: { role: "ADMIN", isActive: true },
        });
        if (activeAdmins <= 1)
          throw new ApplicationError("LAST_ADMIN_REQUIRED");
      }
      const updated = await transaction.user.update({
        where: { id: userId },
        data: { isActive },
        select: { role: true, isActive: true },
      });
      await recordAuditEvent(transaction, {
        userId: actor.id,
        action: "USER_STATUS_CHANGED",
        entityType: "User",
        entityId: userId,
        metadata: { isActive },
      });
      return updated;
    },
    { isolationLevel: "Serializable" },
  );
}
