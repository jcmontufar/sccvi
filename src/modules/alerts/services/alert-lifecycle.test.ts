import { describe, expect, it } from "vitest";

import { assertAlertTransition } from "@/modules/alerts/services/alert-lifecycle";

describe("alert lifecycle", () => {
  it.each([
    ["OPEN", "REVIEWED"],
    ["REVIEWED", "RESOLVED"],
  ] as const)("allows %s to %s", (current, target) => {
    expect(() => assertAlertTransition(current, target)).not.toThrow();
  });

  it.each([
    ["OPEN", "RESOLVED"],
    ["REVIEWED", "OPEN"],
    ["RESOLVED", "REVIEWED"],
    ["RESOLVED", "RESOLVED"],
  ] as const)("rejects %s to %s", (current, target) => {
    expect(() => assertAlertTransition(current, target)).toThrow(
      "El cambio de estado de la alerta no es válido.",
    );
  });
});
