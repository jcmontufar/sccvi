import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("muestra el dashboard analítico con filtros y notas metodológicas", async ({
  page,
}) => {
  await page.goto("/app/analitica");
  await expect(
    page.getByRole("heading", { name: "Dashboard analítico" }),
  ).toBeVisible();
  await expect(page.getByLabel("Resumen ejecutivo")).toBeVisible();
  await expect(page.getByLabel("Fecha de corte")).toBeVisible();
  await expect(page.getByLabel("Dosis para cobertura")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Análisis territorial" }),
  ).toBeVisible();
  await expect(page.getByText("Notas metodológicas.")).toBeVisible();
});

test("aplica filtros sin perder la presentación responsive", async ({
  page,
}) => {
  await page.goto("/app/analitica");
  await page.getByLabel("Sexo").selectOption("FEMALE");
  await page.getByLabel("Orden territorial").selectOption("overdueDoses");
  await page.getByRole("button", { name: "Actualizar análisis" }).click();
  await expect(page).toHaveURL(/sex=FEMALE/);
  await expect(page).toHaveURL(/sortBy=overdueDoses/);
  await expect(
    page.getByRole("heading", { name: "Prioridades operativas" }),
  ).toBeVisible();
});
