import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test("registra una medición histórica y muestra evaluación OMS", async ({
  page,
}) => {
  await login(page);
  const childId = process.env.E2E_EXISTING_CHILD_ID!;
  await page.goto(`/app/ninos/${childId}/crecimiento/nueva`);
  await page.getByLabel("Fecha de medición").fill("2026-01-15");
  await page.getByLabel("Peso (kg)").fill("8.250");
  await page.getByLabel("Talla (cm)").fill("70.20");
  await page.getByLabel("Método de talla").selectOption("RECUMBENT_LENGTH");
  await page.getByRole("button", { name: "Registrar medición" }).click();
  await expect(
    page.getByText("Medición registrada correctamente."),
  ).toBeVisible();
  await expect(page.getByText("OMS 2006").first()).toBeVisible();
  await expect(page.getByText(/diagnóstico/i)).toHaveCount(0);
});
