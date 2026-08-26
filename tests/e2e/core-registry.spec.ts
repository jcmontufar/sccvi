import { expect, test } from "@playwright/test";

import { fictionalSuffix, login } from "./helpers";
import { cleanupCoreRegistryFixture } from "../support/test-database";

let pendingCleanup:
  { community: string; guardian: string; child: string } | undefined;

test.afterEach(async () => {
  if (pendingCleanup) await cleanupCoreRegistryFixture(pendingCleanup);
  pendingCleanup = undefined;
});

test("registro crítico: comunidad, tutor y niño", async ({ page }) => {
  const suffix = fictionalSuffix();
  const community = `Comunidad ficticia E2E ${suffix}`;
  const guardian = `Tutor ficticio ${suffix}`;
  const child = `Niño ficticio ${suffix}`;
  pendingCleanup = { community, guardian, child };
  await login(page);

  await page.goto("/app/comunidades/nueva");
  const center = page.getByLabel("Centro de salud");
  if (await center.isVisible()) await center.selectOption({ index: 1 });
  await page.getByLabel("Nombre").fill(community);
  await page.getByRole("button", { name: "Crear comunidad" }).click();
  await expect(page.getByText(community)).toBeVisible();

  await page.goto("/app/tutores/nuevo");
  const guardianCommunityValue = await page
    .getByLabel("Comunidad")
    .locator("option")
    .filter({ hasText: community })
    .getAttribute("value");
  await page.getByLabel("Comunidad").selectOption(guardianCommunityValue!);
  await page.getByLabel("Nombre completo").fill(guardian);
  await page.getByRole("button", { name: "Registrar tutor" }).click();
  await expect(page.getByText("Tutor registrado correctamente.")).toBeVisible();

  await page.goto("/app/ninos/nuevo");
  const childCommunityValue = await page
    .getByLabel("Comunidad")
    .locator("option")
    .filter({ hasText: community })
    .getAttribute("value");
  await page.getByLabel("Comunidad").selectOption(childCommunityValue!);
  await page.getByLabel("Nombre completo").fill(child);
  await page.getByLabel("Fecha de nacimiento").fill("2025-12-15");
  await page.getByLabel("Sexo registrado").selectOption("MALE");
  await page.getByRole("button", { name: "Registrar niño" }).click();
  await expect(page.getByText("Niño registrado correctamente.")).toBeVisible();
});

test("rechaza una comunidad sin nombre", async ({ page }) => {
  await login(page);
  await page.goto("/app/comunidades/nueva");
  await page.getByRole("button", { name: "Crear comunidad" }).click();
  await expect(page.getByLabel("Nombre")).toBeFocused();
});
