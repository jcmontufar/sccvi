import { cn } from "@/lib/utils";

export function SccviLogo({
  className,
  compact = false,
  inverted = false,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <span
      aria-label="SCCVI, Sistema de Control de Crecimiento y Vacunación Infantil"
      className={cn("inline-flex min-w-0 flex-col", className)}
    >
      <span
        className={cn(
          "text-xl leading-none font-bold tracking-[0.08em]",
          inverted ? "text-white" : "text-primary",
        )}
      >
        SCCVI
      </span>
      {!compact ? (
        <span
          className={cn(
            "mt-1 max-w-52 text-[0.65rem] leading-tight font-medium",
            inverted ? "text-sidebar-foreground/75" : "text-muted-foreground",
          )}
        >
          Crecimiento y vacunación infantil
        </span>
      ) : null}
    </span>
  );
}
