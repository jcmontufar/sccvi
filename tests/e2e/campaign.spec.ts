import { expect, test } from "@playwright/test";

import { fictionalSuffix, login } from "./helpers";
import { cleanupCampaignFixture } from "../support/test-database";

let campaignName: string | undefined;

test.afterEach(async () => {
  if (campaignName) await cleanupCampaignFixture(campaignName);
  campaignName = undefined;
});

test("crea una campaña, conserva la vista previa y registra el resultado", async ({
  page,
}) => {
  await login(page);
  campaignName = `Campaña ficticia E2E ${fictionalSuffix()}`;
  await page.goto("/app/campanas/nueva");
  await page.getByLabel("Nombre").fill(campaignName);
  await page.getByLabel("Asunto").fill("Aviso operativo ficticio SCCVI");
  await page
    .getByLabel("Mensaje")
    .fill("Mensaje ficticio sin información clínica ni personal.");
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    page
      .getByRole("button", { name: "Crear borrador y previsualizar" })
      .click(),
  ]);
  await expect(page.getByText("Tutor ficticio de campaña E2E")).toBeVisible();
  await expect(page.getByText(/Estado: Borrador/i)).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    page.getByRole("button", { name: "Iniciar envío" }).click(),
  ]);
  await expect(page.getByText(/Estado: Fallida/i)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Fallido").first()).toBeVisible();
});
