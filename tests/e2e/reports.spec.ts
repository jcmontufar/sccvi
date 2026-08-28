import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("cobertura carga sin dosis y ofrece el esquema activo", async ({
  page,
}) => {
  await page.goto(
    "/app/reportes?type=vaccination-coverage&doseCode=&from=&to=",
  );
  await expect(page.getByRole("heading", { name: "Reportes" })).toBeVisible();
  await expect(
    page.getByText(/Selecciona una dosis del esquema vigente/i),
  ).toBeVisible();
  const doseSelector = page.getByLabel("Dosis del esquema vigente");
  await expect(doseSelector).toBeVisible();
  const firstDose = doseSelector.locator("option:not([value=''])").first();
  const doseCode = await firstDose.getAttribute("value");
  expect(doseCode).toBeTruthy();
  await doseSelector.selectOption(doseCode!);
  await page.getByRole("button", { name: "Generar reporte" }).click();
  await expect(page).toHaveURL(new RegExp(`doseCode=${doseCode}`));
  await expect(
    page.getByText(/^\d+\/\d+ · (?:\d+\.\d %|N\/A)$/).first(),
  ).toBeVisible();
});

test("dosis inválida es segura y el filtro no aparece en otros reportes", async ({
  page,
}) => {
  await page.goto(
    "/app/reportes?type=vaccination-coverage&doseCode=NOT-A-DOSE&from=&to=",
  );
  await expect(
    page.getByText(/no pertenece al esquema de vacunación vigente/i),
  ).toBeVisible();
  await page.goto("/app/reportes?type=low-weight&from=&to=");
  await expect(page.getByLabel("Dosis del esquema vigente")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Reportes" })).toBeVisible();
});
