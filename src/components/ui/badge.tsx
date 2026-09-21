import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const variants = {
  neutral: "border-border bg-muted text-foreground",
  primary: "border-primary/20 bg-primary/10 text-primary",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  destructive: "border-destructive/20 bg-destructive/10 text-destructive",
} as const;

export function Badge({
  className,
  variant = "neutral",
  ...props
}: ComponentProps<"span"> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        variants[variant],
        className,
      )}
      data-slot="badge"
      {...props}
    />
  );
}
