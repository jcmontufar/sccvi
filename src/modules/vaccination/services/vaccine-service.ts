import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { activeStateSchema } from "@/lib/validation/common-schema";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
import { recordAuditEvent } from "@/modules/audit/services/audit-service";
import {
  vaccineIdSchema,
  vaccineInputSchema,
  vaccineSearchSchema,
} from "@/modules/vaccination/schemas/vaccine-schema";

function duplicateError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new ApplicationError("VACCINE_DUPLICATE");
  }
  throw error;
}

export async function listVaccines(user: ApplicationUser, input: unknown) {
  authorize(user, "vaccine:list");
  const filters = vaccineSearchSchema.parse(input);
  return getPrisma().vaccine.findMany({
    where: {
      name: filters.search
        ? { contains: filters.search, mode: "insensitive" }
        : undefined,
      isActive:
        filters.status === "all" ? undefined : filters.status === "active",
    },
    orderBy: { name: "asc" },
    take: 200,
  });
}

export async function getVaccine(user: ApplicationUser, id: string) {
  authorize(user, "vaccine:read");
  const vaccine = await getPrisma().vaccine.findUnique({
    where: { id: vaccineIdSchema.parse(id) },
  });
  if (!vaccine) throw new ApplicationError("VACCINE_NOT_FOUND");
  return vaccine;
}

export async function createVaccine(user: ApplicationUser, input: unknown) {
  authorize(user, "vaccine:create");
  try {
    return await getPrisma().$transaction(async (transaction) => {
      const vaccine = await transaction.vaccine.create({
        data: vaccineInputSchema.parse(input),
      });
      await recordAuditEvent(transaction, {
        userId: user.id,
        action: "VACCINE_CREATED",
        entityType: "Vaccine",
        entityId: vaccine.id,
      });
      return vaccine;
    });
  } catch (error) {
    duplicateError(error);
  }
}

export async function updateVaccine(
  user: ApplicationUser,
  id: string,
  input: unknown,
) {
  authorize(user, "vaccine:update");
  const existing = await getVaccine(user, id);
  const data = vaccineInputSchema.parse(input);
  const changedFields = [
    existing.name !== data.name ? "name" : null,
    existing.description !== data.description ? "description" : null,
  ].filter((value): value is string => Boolean(value));
  try {
    return await getPrisma().$transaction(async (transaction) => {
      const vaccine = await transaction.vaccine.update({
        where: { id: vaccineIdSchema.parse(id) },
        data,
      });
      await recordAuditEvent(transaction, {
        userId: user.id,
        action: "VACCINE_UPDATED",
        entityType: "Vaccine",
        entityId: vaccine.id,
        metadata: { changedFields },
      });
      return vaccine;
    });
  } catch (error) {
    duplicateError(error);
  }
}

export async function setVaccineActive(
  user: ApplicationUser,
  id: string,
  isActive: boolean,
) {
  const activeState = activeStateSchema.parse(isActive);
  authorize(user, "vaccine:deactivate");
  await getVaccine(user, id);
  return getPrisma().$transaction(async (transaction) => {
    const vaccine = await transaction.vaccine.update({
      where: { id: vaccineIdSchema.parse(id) },
      data: { isActive: activeState },
    });
    await recordAuditEvent(transaction, {
      userId: user.id,
      action: "VACCINE_STATUS_CHANGED",
      entityType: "Vaccine",
      entityId: vaccine.id,
      metadata: { isActive: activeState },
    });
    return vaccine;
  });
}
