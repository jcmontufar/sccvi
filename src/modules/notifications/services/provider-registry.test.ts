import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { NotificationProvider } from "@/modules/notifications/services/notification-delivery";
import {
  asProviderRegistry,
  ProviderRegistry,
} from "@/modules/notifications/services/provider-registry";

const emailProvider: NotificationProvider = {
  channel: "EMAIL",
  deliver: vi.fn(),
};

describe("notification provider registry", () => {
  it("returns only a provider with the requested channel", () => {
    const registry = new ProviderRegistry(new Map([["EMAIL", emailProvider]]));
    expect(registry.get("EMAIL")).toBe(emailProvider);
    expect(() => registry.get("TELEGRAM")).toThrow(
      "NOTIFICATION_PROVIDER_CHANNEL_MISMATCH",
    );
  });

  it("rejects a legacy injected provider for the wrong channel", () => {
    const registry = asProviderRegistry(emailProvider);
    expect(() => registry.get("TELEGRAM")).toThrow(
      "NOTIFICATION_PROVIDER_CHANNEL_MISMATCH",
    );
  });
});
