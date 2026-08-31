import { expect, test } from "@playwright/test";

test("staging critical reads are reachable without domain mutations", async ({
  page,
  request,
}) => {
  const response = await request.get("/");
  expect(response.ok()).toBe(true);

  await page.goto("/app");
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" }),
  ).toBeVisible();

  await page
    .getByLabel("Correo electrónico")
    .fill(process.env.STAGING_SMOKE_USER_EMAIL!);
  await page
    .getByLabel("Contraseña")
    .fill(process.env.STAGING_SMOKE_USER_PASSWORD!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("Área protegida")).toBeVisible();

  const reads = [
    ["/app/centros-de-salud", "Centros de salud"],
    ["/app/comunidades", "Comunidades"],
    ["/app/vacunas", "Catálogo de vacunas"],
    ["/app/reportes", "Reportes"],
    [
      `/app/ninos/${process.env.STAGING_SMOKE_CHILD_ID!}/crecimiento`,
      "Crecimiento",
    ],
    [
      `/app/ninos/${process.env.STAGING_SMOKE_CHILD_ID!}/vacunacion`,
      "Vacunación",
    ],
  ] as const;
  for (const [path, visibleText] of reads) {
    const navigation = await page.goto(path);
    expect(navigation?.ok()).toBe(true);
    await expect(
      page.getByText(visibleText, { exact: true }).first(),
    ).toBeVisible();
  }

  const invalidQr = await page.goto(
    "/tarjeta/staging-invalid-token-that-does-not-exist",
  );
  expect(invalidQr?.ok()).toBe(true);
  await expect(
    page.getByText("La credencial de la tarjeta digital no es válida."),
  ).toBeVisible();
});
