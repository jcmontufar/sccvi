import { expect, test } from "@playwright/test";

const fixture = (name: string) => process.env[name];

test("rechaza una credencial opaca inválida", async ({ page }) => {
  await page.goto(`/tarjeta/${"A".repeat(43)}`);
  await expect(page.getByText(/credencial.*no es válida/i)).toBeVisible();
});

for (const [name, message] of [
  ["E2E_REVOKED_QR_TOKEN", /credencial.*revocada/i],
  ["E2E_EXPIRED_QR_TOKEN", /credencial.*expiró/i],
] as const) {
  test(`${name} falla de forma segura`, async ({ page }) => {
    test.skip(!fixture(name), `Fixture local ${name} no configurada.`);
    await page.goto(`/tarjeta/${fixture(name)}`);
    await expect(page.getByText(message)).toBeVisible();
  });
}

test("acepta una credencial válida", async ({ page }) => {
  test.skip(
    !fixture("E2E_VALID_QR_TOKEN"),
    "Fixture QR válida no configurada.",
  );
  await page.goto(`/tarjeta/${fixture("E2E_VALID_QR_TOKEN")}`);
  await expect(
    page.getByText("Esta tarjeta confirma datos básicos."),
  ).toBeVisible();
});

test("PIN incorrecto se deniega y los intentos repetidos se bloquean", async ({
  page,
}) => {
  test.skip(
    !fixture("E2E_LOCKOUT_QR_TOKEN"),
    "Fixture QR de bloqueo no configurada.",
  );
  await page.goto(`/tarjeta/${fixture("E2E_LOCKOUT_QR_TOKEN")}`);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.getByLabel("PIN").fill(String(900000 + attempt));
    await Promise.all([
      page.waitForResponse(
        (response) => response.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Ver tarjeta" }).click(),
    ]);
    await expect(
      page.getByText(/no fue posible verificar la credencial/i),
    ).toBeVisible();
  }
  await page.getByLabel("PIN").fill(fixture("E2E_QR_PIN")!);
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    page.getByRole("button", { name: "Ver tarjeta" }).click(),
  ]);
  await expect(
    page.getByText(/no fue posible verificar la credencial/i),
  ).toBeVisible();
});

test("PIN correcto permite acceso", async ({ page }) => {
  test.skip(
    !fixture("E2E_PIN_QR_TOKEN") || !fixture("E2E_QR_PIN"),
    "Fixture QR/PIN local no configurada.",
  );
  await page.goto(`/tarjeta/${fixture("E2E_PIN_QR_TOKEN")}`);
  await page.getByLabel("PIN").fill(fixture("E2E_QR_PIN")!);
  await page.getByRole("button", { name: "Ver tarjeta" }).click();
  await expect(
    page.getByText("Esta tarjeta confirma datos básicos."),
  ).toBeVisible();
});
