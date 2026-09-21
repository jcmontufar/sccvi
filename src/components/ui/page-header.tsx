import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { PageBackLink } from "./page-back-link";

export function PageHeader({
  title,
  description,
  eyebrow,
  backHref,
  backLabel,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-3", className)}>
      {backHref ? <PageBackLink href={backHref} label={backLabel} /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-sm font-semibold text-primary">{eyebrow}</p>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
