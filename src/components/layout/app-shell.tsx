"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SccviLogo } from "@/components/branding/sccvi-logo";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/modules/auth/actions";
import type { NavigationItem } from "@/modules/auth/navigation";

const roleLabels = {
  ADMIN: "Administración",
  HEALTH_STAFF: "Personal de salud",
  CENTER_MANAGER: "Gestión del centro",
  GUARDIAN: "Responsable",
} as const;

function NavigationIcon({ href }: { href: string }) {
  const path = href.split("/").filter(Boolean)[1] ?? "inicio";
  const paths: Record<string, React.ReactNode> = {
    inicio: <path d="m3 11 9-8 9 8v10h-6v-6H9v6H3z" />,
    "centros-de-salud": <path d="M4 21V6h16v15M9 10h6m-3-3v6M8 21v-4h8v4" />,
    comunidades: <path d="M3 21v-8l5-3 5 3v8m0-6 4-2 4 3v5" />,
    tutores: (
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8m7 8 2 2 4-4" />
    ),
    ninos: (
      <path d="M9 12a4 4 0 1 0 6 0M12 2v3m-5-1 2 2m8-2-2 2M5 21a7 7 0 0 1 14 0" />
    ),
    vacunas: (
      <path d="m5 19 10-10m-7-3 10 10M4 20l3-1-2-2-1 3Zm9-15 2-2 6 6-2 2" />
    ),
    alertas: (
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 13h4" />
    ),
    campanas: (
      <path d="m3 11 14-5v12L3 13v-2Zm14-1 4-2v8l-4-2M6 14l1 6h4l-1-5" />
    ),
    analitica: <path d="M4 19V9m6 10V5m6 14v-7m5 7H2" />,
    reportes: <path d="M5 3h10l4 4v14H5V3Zm9 0v5h5M8 12h8m-8 4h8" />,
  };
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[path] ?? paths.inicio}
    </svg>
  );
}

function isCurrentPath(pathname: string, href: string) {
  return href === "/app"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({
  navigation,
  mobile = false,
}: {
  navigation: NavigationItem[];
  mobile?: boolean;
}) {
  const pathname = usePathname();
  return navigation.map((item) => {
    const current = isCurrentPath(pathname, item.href);
    return (
      <Link
        aria-current={current ? "page" : undefined}
        className={
          mobile
            ? `flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 ${current ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`
            : `flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-sidebar-ring/40 ${current ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`
        }
        href={item.href}
        key={item.href}
      >
        <NavigationIcon href={item.href} />
        {item.label}
      </Link>
    );
  });
}

export function AppShell({
  children,
  navigation,
  user,
}: {
  children: React.ReactNode;
  navigation: NavigationItem[];
  user: { fullName: string; role: keyof typeof roleLabels };
}) {
  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:flex">
        <Link
          className="rounded-xl px-3 py-3 outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/40"
          href="/app"
        >
          <SccviLogo className="mx-auto size-16" compact />
        </Link>
        <nav
          aria-label="Navegación principal"
          className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
        >
          <NavigationLinks navigation={navigation} />
        </nav>
        <div className="mt-4 border-t border-sidebar-border pt-4">
          <p className="truncate px-3 text-sm font-semibold">{user.fullName}</p>
          <p className="mt-0.5 px-3 text-xs text-sidebar-foreground/70">
            {roleLabels[user.role]}
          </p>
          <form action={logoutAction} className="mt-3">
            <Button
              className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
              type="submit"
              variant="outline"
            >
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b bg-card/95 shadow-sm backdrop-blur md:hidden">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <Link
            className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            href="/app"
          >
            <SccviLogo className="size-11" compact />
          </Link>
          <details className="group relative">
            <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-xl border bg-background text-primary shadow-sm outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Abrir menú principal</span>
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <div className="absolute top-13 right-0 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border bg-card p-3 shadow-xl">
              <nav aria-label="Navegación móvil" className="grid gap-1">
                <NavigationLinks mobile navigation={navigation} />
              </nav>
              <div className="mt-3 border-t pt-3">
                <p className="truncate px-3 text-sm font-semibold">
                  {user.fullName}
                </p>
                <p className="px-3 text-xs text-muted-foreground">
                  {roleLabels[user.role]}
                </p>
                <form action={logoutAction} className="mt-3">
                  <Button className="w-full" type="submit" variant="outline">
                    Cerrar sesión
                  </Button>
                </form>
              </div>
            </div>
          </details>
        </div>
      </header>

      <main className="mx-auto min-h-svh max-w-[100rem] px-4 py-6 sm:px-6 sm:py-8 md:ml-64 lg:px-8">
        {children}
      </main>
    </div>
  );
}
