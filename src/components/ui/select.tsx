import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-xs outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15",
        className,
      )}
      data-slot="select"
      {...props}
    />
  );
}
