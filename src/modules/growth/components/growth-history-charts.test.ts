import { describe, expect, it } from "vitest";

import { GROWTH_CHART_REFERENCE_LABEL } from "@/modules/growth/components/growth-history-charts";

describe("growth chart labels", () => {
  it("distinguishes the WHO reference from factual measurements", () => {
    expect(GROWTH_CHART_REFERENCE_LABEL).toBe("Referencia OMS");
    expect(GROWTH_CHART_REFERENCE_LABEL).not.toBe("Peso registrado");
    expect(GROWTH_CHART_REFERENCE_LABEL).not.toBe("Talla registrada");
  });
});
