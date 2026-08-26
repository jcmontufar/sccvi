import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test("registra una aplicación factual desde una dosis aplicable", async ({
  page,
}) => {
  await login(page);
  const childId = process.env.E2E_EXISTING_CHILD_ID!;
  await page.goto(`/app/ninos/${childId}/vacunacion`);
  await expect(page.getByRole("heading", { name: "Vacunación" })).toBeVisible();
  await page.getByRole("link", { name: "Registrar vacuna" }).click();
  await page.getByLabel("Dosis").selectOption({ index: 1 });
  await page.getByLabel("Fecha de aplicación").fill("2026-01-15");
  await page.getByRole("button", { name: "Registrar vacuna" }).click();
  await expect(
    page.getByText("Vacunación registrada correctamente."),
  ).toBeVisible();
  await expect(page.getByText("Aplicada").first()).toBeVisible();
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
