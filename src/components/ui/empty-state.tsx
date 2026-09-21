import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/35 p-6 text-center text-sm text-muted-foreground",
        className,
      )}
      data-slot="empty-state"
      {...props}
    />
  );
}
