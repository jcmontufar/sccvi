import { expect, test } from "@playwright/test";

test.describe("PWA", () => {
  test("publishes the installable SCCVI manifest", async ({ request }) => {
    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBe(true);
    await expect(manifestResponse.json()).resolves.toMatchObject({
      name: "Sistema de Control de Crecimiento y Vacunación Infantil",
      short_name: "SCCVI",
      display: "standalone",
      start_url: "/iniciar-sesion",
    });
  });

  test("shows only the safe offline fallback when navigation loses the network", async ({
    context,
    page,
  }) => {
    await page.goto("/offline.html");
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("sccvi-offline-"))
          .map((cacheName) => caches.delete(cacheName)),
      );

      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    );

    try {
      await context.setOffline(true);
      await page.goto("/app", { waitUntil: "domcontentloaded" });

      await expect(
        page.getByRole("heading", { name: "Sin conexión" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Reintentar" }),
      ).toBeVisible();

      const cachedPaths = await page.evaluate(async () => {
        const cacheNames = await caches.keys();
        const paths: string[] = [];

        for (const cacheName of cacheNames.filter((name) =>
          name.startsWith("sccvi-offline-"),
        )) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          paths.push(
            ...requests.map((request) => new URL(request.url).pathname),
          );
        }

        return paths;
      });
      expect(cachedPaths).toEqual(["/offline.html"]);
    } finally {
      await context.setOffline(false);
    }
  });
});
