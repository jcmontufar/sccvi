import { describe, expect, it } from "vitest";

import {
  buildStagingDemoPlan,
  requireStagingDemoConfirmation,
  stagingDemoConfirmation,
} from "./staging-demo-dataset";

describe("staging demo dataset", () => {
  it("fails closed without the exact staging target and confirmation", () => {
    expect(() => requireStagingDemoConfirmation({})).toThrow(
      "STAGING DEMO BLOCKED",
    );
    expect(() =>
      requireStagingDemoConfirmation({
        SCCVI_DEPLOYMENT_ENV: "PRODUCTION",
        SCCVI_STAGING_DEMO_CONFIRMED: stagingDemoConfirmation,
      }),
    ).toThrow("STAGING DEMO BLOCKED");
  });

  it("accepts only the explicit isolated-staging confirmation", () => {
    expect(() =>
      requireStagingDemoConfirmation({
        SCCVI_DEPLOYMENT_ENV: "STAGING",
        SCCVI_STAGING_DEMO_CONFIRMED: stagingDemoConfirmation,
      }),
    ).not.toThrow();
  });

  it("builds the same unique fixture plan on every run", () => {
    const first = buildStagingDemoPlan();
    const second = buildStagingDemoPlan();
    expect(second).toEqual(first);
    expect(first.communities).toHaveLength(5);
    expect(first.children).toHaveLength(18);
    const ids = [
      ...first.communities.map(({ id }) => id),
      ...first.children.flatMap(({ id, guardian, relationId }) => [
        id,
        guardian.id,
        relationId,
      ]),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(first.children.map(({ scenario }) => scenario))).toEqual(
      new Set([
        "normal",
        "low",
        "high",
        "overdue",
        "applied",
        "pending",
        "follow-up",
      ]),
    );
  });
});
