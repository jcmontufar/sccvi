import { expect, type Page } from "@playwright/test";

export async function login(page: Page) {
  await page.goto("/iniciar-sesion");
  await page.getByLabel("Correo electrónico").fill(process.env.E2E_USER_EMAIL!);
  await page.getByLabel("Contraseña").fill(process.env.E2E_USER_PASSWORD!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/app(?:\/)?$/);
}

export function fictionalSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}
