import { beforeEach, describe, expect, it, vi } from "vitest";

import NewHealthCenterPage from "./page";

const mocks = vi.hoisted(() => ({ session: vi.fn(), notFound: vi.fn() }));
vi.mock("@/modules/auth/session", () => ({
  requireApplicationUser: mocks.session,
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/modules/health-centers/components/health-center-form", () => ({
  HealthCenterForm: () => null,
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.notFound.mockImplementation(() => {
    throw new Error("NOT_FOUND");
  });
});

describe("new health-center page authorization", () => {
  it.each(["HEALTH_STAFF", "CENTER_MANAGER", "GUARDIAN"])(
    "rejects direct navigation for %s",
    async (role) => {
      mocks.session.mockResolvedValue({
        role,
        isActive: true,
        healthCenterId: "center",
      });
      await expect(NewHealthCenterPage()).rejects.toThrow("NOT_FOUND");
    },
  );
  it("requires authentication before displaying the form", async () => {
    mocks.session.mockRejectedValue(new Error("UNAUTHORIZED"));
    await expect(NewHealthCenterPage()).rejects.toThrow("UNAUTHORIZED");
  });
  it("renders for an active ADMIN", async () => {
    mocks.session.mockResolvedValue({ role: "ADMIN", isActive: true });
    await expect(NewHealthCenterPage()).resolves.toBeDefined();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
});
