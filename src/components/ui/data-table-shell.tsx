import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function DataTableShell({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm [&_table]:w-full [&_thead]:bg-muted/70 [&_th]:whitespace-nowrap [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase [&_td]:px-4 [&_td]:py-3.5 [&_tbody_tr]:border-t [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-accent/35",
        className,
      )}
      data-slot="data-table-shell"
      {...props}
    />
  );
}
