import { describe, expect, it } from "vitest";

import { resolveAnalyticsCenterId } from "@/modules/analytics/services/analytics-authorization";
import type { ApplicationUser } from "@/modules/auth/types";

const staff: ApplicationUser = {
  id: "staff",
  authUserId: "auth-staff",
  healthCenterId: "center-a",
  fullName: "Personal ficticio",
  email: "staff@example.test",
  role: "HEALTH_STAFF",
  isActive: true,
};

describe("analytics center authorization", () => {
  it("keeps health staff inside the assigned center", () => {
    expect(resolveAnalyticsCenterId(staff, "")).toBe("center-a");
    expect(resolveAnalyticsCenterId(staff, "center-a")).toBe("center-a");
  });

  it("rejects a cross-center IDOR attempt", () => {
    expect(() => resolveAnalyticsCenterId(staff, "center-b")).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("allows an administrator to select one center or the global scope", () => {
    const admin = { ...staff, role: "ADMIN" as const, healthCenterId: null };
    expect(resolveAnalyticsCenterId(admin, "center-b")).toBe("center-b");
    expect(resolveAnalyticsCenterId(admin, "")).toBeUndefined();
  });
});
