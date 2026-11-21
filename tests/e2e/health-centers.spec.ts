import { expect, test } from "@playwright/test";

import { fictionalSuffix, login } from "./helpers";
import { cleanupHealthCenterFixture } from "../support/test-database";

let fixtureCode: string | undefined;
test.afterEach(async () => {
  if (fixtureCode) await cleanupHealthCenterFixture(fixtureCode);
  fixtureCode = undefined;
});

test("administración: crear centro y rechazar código duplicado", async ({
  page,
}) => {
  const suffix = fictionalSuffix();
  fixtureCode = `E2E-CENTER-${suffix}`;
  const name = `Centro ficticio E2E ${suffix}`;
  await login(page);
  await page.goto("/app/centros-de-salud");
  await page
    .getByRole("link", { name: "Crear centro de salud", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Crear centro de salud", exact: true })
    .click();
  expect(
    await page
      .getByLabel("Nombre", { exact: true })
      .evaluate((el: HTMLInputElement) => el.validity.valid),
  ).toBe(false);
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByLabel("Código", { exact: true }).fill(fixtureCode);
  await page
    .getByRole("button", { name: "Crear centro de salud", exact: true })
    .click();
  await expect(page).toHaveURL(
    /\/app\/centros-de-salud\/[0-9a-f-]+\?creado=1$/,
  );
  await expect(
    page.getByText("El centro de salud se creó correctamente."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Volver a centros de salud" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.goto("/app/centros-de-salud/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill(`${name} duplicado`);
  await page.getByLabel("Código", { exact: true }).fill(fixtureCode);
  await page
    .getByRole("button", { name: "Crear centro de salud", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Ya existe un centro de salud con ese código.",
  );
});
