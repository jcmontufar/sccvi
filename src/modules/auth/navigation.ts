import type { ApplicationRole } from "@/modules/auth/types";

export type NavigationItem = { href: string; label: string };

export function getNavigation(role: ApplicationRole): NavigationItem[] {
  const items: NavigationItem[] = [{ href: "/app", label: "Inicio" }];

  if (role !== "GUARDIAN") {
    items.push(
      { href: "/app/centros-de-salud", label: "Centros de salud" },
      { href: "/app/comunidades", label: "Comunidades" },
    );
  }

  if (role !== "GUARDIAN") {
    items.push({ href: "/app/tutores", label: "Tutores" });
  }

  items.push({ href: "/app/ninos", label: "Niños" });

  if (role !== "GUARDIAN") {
    items.push(
      { href: "/app/vacunas", label: "Vacunas" },
      { href: "/app/alertas", label: "Alertas" },
    );
  }

  if (role === "ADMIN" || role === "CENTER_MANAGER") {
    items.push({ href: "/app/campanas", label: "Campañas" });
  }

  if (role !== "GUARDIAN") {
    items.push(
      { href: "/app/analitica", label: "Analítica" },
      { href: "/app/reportes", label: "Reportes" },
    );
  }

  return items;
}
