import { describe, expect, it } from "vitest";

import { parseInvitationFragment } from "@/modules/auth/invite-fragment";

describe("invitation fragment", () => {
  it("accepts only an invitation with both session tokens", () => {
    expect(
      parseInvitationFragment(
        "#type=invite&access_token=opaque-access&refresh_token=opaque-refresh",
      ),
    ).toEqual({ accessToken: "opaque-access", refreshToken: "opaque-refresh" });
  });

  it.each([
    "",
    "#type=invite&access_token=opaque-access",
    "#type=recovery&access_token=opaque-access&refresh_token=opaque-refresh",
  ])("rejects incomplete or unrelated fragments", (fragment) => {
    expect(parseInvitationFragment(fragment)).toBeNull();
  });
});
