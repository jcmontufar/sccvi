import { describe, expect, it } from "vitest";

import { deliveryResultToUpdate } from "@/modules/notifications/services/notification-delivery";

describe("notification delivery state", () => {
  it("records successful provider delivery as sent", () => {
    expect(
      deliveryResultToUpdate({
        delivered: true,
        providerMessageId: "provider-id",
      }),
    ).toMatchObject({
      status: "SENT",
      providerMessageId: "provider-id",
      errorMessage: null,
    });
  });

  it("never marks a failed delivery as sent", () => {
    expect(
      deliveryResultToUpdate({
        delivered: false,
        errorMessage: "Proveedor no disponible",
      }),
    ).toMatchObject({
      status: "FAILED",
      errorMessage: "Proveedor no disponible",
      sentAt: null,
    });
  });
});
