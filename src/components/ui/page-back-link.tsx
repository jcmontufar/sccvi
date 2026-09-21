import Link from "next/link";

import { cn } from "@/lib/utils";

export function PageBackLink({
  href,
  label = "Volver",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-primary outline-none transition-colors hover:text-primary/75 focus-visible:ring-3 focus-visible:ring-ring/30",
        className,
      )}
      href={href}
    >
      <svg
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="m15 18-6-6 6-6" />
        <path d="M9 12h10" />
      </svg>
      {label}
    </Link>
  );
}
