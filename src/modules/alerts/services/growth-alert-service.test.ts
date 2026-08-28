import { describe, expect, it, vi } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
import { syncGrowthPercentileAlerts } from "@/modules/alerts/services/growth-alert-service";

function transactionMock() {
  return {
    alert: {
      upsert: vi.fn().mockResolvedValue({ id: "alert" }),
      updateMany: vi.fn(),
    },
  };
}

describe("growth percentile alert persistence", () => {
  it("does not auto-resolve an existing alert when a recalculation is normal", async () => {
    const transaction = transactionMock();
    await syncGrowthPercentileAlerts(
      transaction as unknown as Prisma.TransactionClient,
      "child",
      [
        {
          id: "assessment",
          indicator: "WEIGHT_FOR_AGE",
          percentile: { toString: () => "50" },
        },
      ],
    );
    expect(transaction.alert.updateMany).not.toHaveBeenCalled();
    expect(transaction.alert.upsert).not.toHaveBeenCalled();
  });

  it("updates wording without resetting the alert lifecycle", async () => {
    const transaction = transactionMock();
    await syncGrowthPercentileAlerts(
      transaction as unknown as Prisma.TransactionClient,
      "child",
      [
        {
          id: "assessment",
          indicator: "WEIGHT_FOR_AGE",
          percentile: { toString: () => "0.878" },
        },
      ],
    );
    expect(transaction.alert.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          title: "Seguimiento por percentil de peso bajo",
          message: expect.stringContaining("no constituye un diagnóstico"),
        },
      }),
    );
  });
});
