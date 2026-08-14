import Link from "next/link";

const futureSections = ["Vacunación", "Alertas", "Carné digital"];

export function ChildNavigation({
  childId,
  active,
}: {
  childId: string;
  active: "summary" | "growth";
}) {
  const links = [
    { href: `/app/ninos/${childId}`, label: "Resumen", key: "summary" },
    {
      href: `/app/ninos/${childId}/crecimiento`,
      label: "Crecimiento",
      key: "growth",
    },
  ] as const;
  return (
    <nav
      aria-label="Secciones del perfil del niño"
      className="flex gap-2 overflow-x-auto border-b pb-3"
    >
      {links.map((item) => (
        <Link
          aria-current={active === item.key ? "page" : undefined}
          className={
            active === item.key
              ? "rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
              : "rounded-lg px-3 py-2 text-sm hover:bg-muted"
          }
          href={item.href}
          key={item.key}
        >
          {item.label}
        </Link>
      ))}
      {futureSections.map((label) => (
        <span
          aria-disabled="true"
          className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted-foreground"
          key={label}
        >
          {label} · Próximamente
        </span>
      ))}
    </nav>
  );
}
