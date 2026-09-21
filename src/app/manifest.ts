import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
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
  };
}
