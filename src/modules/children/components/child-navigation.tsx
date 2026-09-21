import Link from "next/link";

export function ChildNavigation({
  childId,
  active,
  canManageDigitalCard = false,
}: {
  childId: string;
  active: "summary" | "growth" | "vaccination" | "card";
  canManageDigitalCard?: boolean;
}) {
  const links = [
    { href: `/app/ninos/${childId}`, label: "Resumen", key: "summary" },
    {
      href: `/app/ninos/${childId}/crecimiento`,
      label: "Crecimiento",
      key: "growth",
    },
    {
      href: `/app/ninos/${childId}/vacunacion`,
      label: "Vacunación",
      key: "vaccination",
    },
    {
      href: `/app/ninos/${childId}/tarjeta`,
      label: "Tarjeta digital",
      key: "card",
    },
  ] as const;
  const visibleLinks = canManageDigitalCard
    ? links
    : links.filter((item) => item.key !== "card");
  return (
    <nav
      aria-label="Secciones del perfil del niño"
      className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2 shadow-sm"
    >
      {visibleLinks.map((item) => (
        <Link
          aria-current={active === item.key ? "page" : undefined}
          className={
            active === item.key
              ? "flex min-h-11 items-center rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-primary-foreground"
              : "flex min-h-11 items-center rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }
          href={item.href}
          key={item.key}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
