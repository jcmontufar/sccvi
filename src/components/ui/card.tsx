import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"article">) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border/80 bg-card shadow-sm",
        className,
      )}
      data-slot="card"
      {...props}
    />
  );
}
