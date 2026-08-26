import { expect, test } from "@playwright/test";

import { fictionalSuffix, login } from "./helpers";
import { cleanupGrowthFixture } from "../support/test-database";

let pendingCleanup: { childId: string; notes: string } | undefined;

test.afterEach(async () => {
  if (pendingCleanup) await cleanupGrowthFixture(pendingCleanup);
  pendingCleanup = undefined;
});

test("registra una medición histórica y muestra evaluación OMS", async ({
  page,
}) => {
  await login(page);
  const childId = process.env.E2E_EXISTING_CHILD_ID!;
  const notes = `Medición ficticia E2E ${fictionalSuffix()}`;
  pendingCleanup = { childId, notes };
  await page.goto(`/app/ninos/${childId}/crecimiento/nueva`);
  await page.getByLabel("Fecha de medición").fill("2026-01-15");
  await page.getByLabel("Peso (kg)").fill("8.250");
  await page.getByLabel("Talla (cm)").fill("70.20");
  await page.getByLabel("Método de talla").selectOption("RECUMBENT_LENGTH");
  await page.getByLabel("Notas").fill(notes);
  await page.getByRole("button", { name: "Registrar medición" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/app/ninos/${childId}/crecimiento\\?registrada=1$`),
  );
  await expect(
    page.getByText("La medición se guardó correctamente."),
  ).toBeVisible();
  await expect(page.getByText("OMS 2006").first()).toBeVisible();
  await expect(
    page.getByText(/no constituyen un diagnóstico médico/i),
  ).toBeVisible();
});
