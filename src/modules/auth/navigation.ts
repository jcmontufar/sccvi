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

  return items;
}
