import Image from "next/image";

import { cn } from "@/lib/utils";

const logoAssets = {
  full: {
    src: "/branding/sccvi-logo.png",
    width: 1374,
    height: 1145,
  },
  inverse: {
    src: "/branding/sccvi-logo-inverse.png",
    width: 1254,
    height: 1254,
  },
  isotype: {
    src: "/branding/sccvi-isotype.png",
    width: 1254,
    height: 1254,
  },
} as const;

export function SccviLogo({
  className,
  compact = false,
  inverted = false,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  const asset = compact
    ? logoAssets.isotype
    : inverted
      ? logoAssets.inverse
      : logoAssets.full;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        compact ? "size-11" : "w-40 sm:w-48",
        className,
      )}
    >
      <Image
        alt={
          compact
            ? "SCCVI"
            : "SCCVI, Sistema de Control de Crecimiento y Vacunación Infantil"
        }
        className="h-auto max-h-full w-auto max-w-full object-contain"
        height={asset.height}
        priority
        sizes={
          compact
            ? "(min-width: 768px) 64px, 44px"
            : "(min-width: 640px) 192px, 160px"
        }
        src={asset.src}
        width={asset.width}
      />
    </span>
  );
}
