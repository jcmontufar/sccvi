import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import { config as proxyConfig } from "../../../proxy";
import nextConfig from "../../../next.config";

function readPngDimensions(path: string) {
  const png = readFileSync(resolve(path));

  expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

describe("PWA configuration", () => {
  it("exposes the approved SCCVI manifest", () => {
    expect(manifest()).toEqual({
      name: "Sistema de Control de Crecimiento y Vacunación Infantil",
      short_name: "SCCVI",
      description: "Sistema de Control de Crecimiento y Vacunación Infantil",
      lang: "es-GT",
      id: "/",
      start_url: "/iniciar-sesion",
      scope: "/",
      display: "standalone",
      theme_color: "#07556D",
      background_color: "#F4F8FA",
      icons: [
        {
          src: "/branding/pwa-icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/branding/pwa-icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/branding/pwa-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    });
  });

  it("ships icons with the dimensions declared by the manifest", () => {
    expect(readPngDimensions("public/branding/pwa-icon-192.png")).toEqual({
      width: 192,
      height: 192,
    });
    expect(readPngDimensions("public/branding/pwa-icon-512.png")).toEqual({
      width: 512,
      height: 512,
    });
    expect(readPngDimensions("public/branding/pwa-maskable-512.png")).toEqual({
      width: 512,
      height: 512,
    });
  });

  it("serves the service worker with restrictive cache headers", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");
    const headerRules = await nextConfig.headers?.();
    const serviceWorkerRule = headerRules?.find(
      ({ source }) => source === "/sw.js",
    );

    expect(serviceWorkerRule?.headers).toEqual(
      expect.arrayContaining([
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate",
        },
        {
          key: "Service-Worker-Allowed",
          value: "/",
        },
      ]),
    );
  });

  it("keeps public PWA resources outside the session proxy", () => {
    const [matcher] = proxyConfig.matcher;
    const matchesSessionProxy = new RegExp(`^${matcher}$`);

    expect(matchesSessionProxy.test("/manifest.webmanifest")).toBe(false);
    expect(matchesSessionProxy.test("/sw.js")).toBe(false);
    expect(matchesSessionProxy.test("/offline.html")).toBe(false);
    expect(matchesSessionProxy.test("/branding/pwa-icon-192.png")).toBe(false);
    expect(matchesSessionProxy.test("/branding/pwa-icon-512.png")).toBe(false);
    expect(matchesSessionProxy.test("/branding/pwa-maskable-512.png")).toBe(
      false,
    );
    expect(matchesSessionProxy.test("/app")).toBe(true);
    expect(matchesSessionProxy.test("/api/v1/reports/pdf")).toBe(true);
  });
});
