import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  ApplicationError,
  getSafeHttpStatus,
} from "@/lib/errors/application-error";

describe("safe HTTP error mapping", () => {
  it("distinguishes unauthenticated, forbidden, validation and internal errors", () => {
    expect(getSafeHttpStatus(new ApplicationError("UNAUTHORIZED"))).toBe(401);
    expect(getSafeHttpStatus(new ApplicationError("FORBIDDEN"))).toBe(403);
    expect(getSafeHttpStatus(new ApplicationError("VALIDATION_ERROR"))).toBe(
      400,
    );
    expect(getSafeHttpStatus(z.string().safeParse(1).error)).toBe(400);
    expect(getSafeHttpStatus(new Error("internal"))).toBe(500);
  });
});
