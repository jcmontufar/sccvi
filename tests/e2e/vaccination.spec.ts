import { expect, test } from "@playwright/test";

import { fictionalSuffix, login } from "./helpers";
import { cleanupVaccinationFixture } from "../support/test-database";

let pendingCleanup: { childId: string; notes: string } | undefined;

test.afterEach(async () => {
  if (pendingCleanup) await cleanupVaccinationFixture(pendingCleanup);
  pendingCleanup = undefined;
});

test("registra una aplicación factual desde una dosis aplicable", async ({
  page,
}) => {
  await login(page);
  const childId = process.env.E2E_EXISTING_CHILD_ID!;
  const notes = `Vacunación ficticia E2E ${fictionalSuffix()}`;
  pendingCleanup = { childId, notes };
  await page.goto(`/app/ninos/${childId}/vacunacion`);
  await expect(page).toHaveURL(`/app/ninos/${childId}/vacunacion`);
  await expect(
    page.getByText("Vacunación", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Registrar vacuna" }).click();
  await page
    .getByLabel("Dosis")
    .selectOption({ label: "BCG — Dosis al nacer" });
  await page.getByLabel("Fecha de aplicación").fill("2026-01-15");
  await page.getByLabel("Notas").fill(notes);
  await page.getByRole("button", { name: "Registrar vacuna" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/app/ninos/${childId}/vacunacion\\?registrada=1$`),
  );
  await expect(
    page.getByText("La vacuna se registró correctamente."),
  ).toBeVisible();
  const bcg = page.locator("article").filter({
    has: page.getByRole("heading", { name: "BCG" }),
  });
  await expect(bcg.getByText("Aplicada")).toBeVisible();
});

test("no presenta hexavalente histórica no aplicable como atrasada", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_HISTORICAL_CHILD_ID,
    "Fixture histórica local no configurada.",
  );
  await login(page);
  await page.goto(
    `/app/ninos/${process.env.E2E_HISTORICAL_CHILD_ID!}/vacunacion`,
  );
  await expect(page.getByText(/Hexavalente.*Atrasada/i)).toHaveCount(0);
});
