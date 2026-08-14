import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";
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
    return await getPrisma().vaccine.create({
      data: vaccineInputSchema.parse(input),
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
  await getVaccine(user, id);
  try {
    return await getPrisma().vaccine.update({
      where: { id: vaccineIdSchema.parse(id) },
      data: vaccineInputSchema.parse(input),
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
  authorize(user, "vaccine:deactivate");
  await getVaccine(user, id);
  return getPrisma().vaccine.update({
    where: { id: vaccineIdSchema.parse(id) },
    data: { isActive },
  });
}
