import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function ChartCard({
  title,
  description,
  summary,
  children,
}: {
  title: string;
  description: string;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mb-4 text-sm leading-5 text-muted-foreground">
        {description}
      </p>
      {summary ? <p className="sr-only">{summary}</p> : null}
      {children}
    </Card>
  );
}
