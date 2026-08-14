import "server-only";

import { cache } from "react";

import { ApplicationError } from "@/lib/errors/application-error";
import { getPrisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApplicationUser } from "@/modules/auth/types";

type AuthenticatedProfile =
  | { status: "unauthenticated" }
  | { status: "missing-profile" }
  | { status: "inactive" }
  | { status: "active"; user: ApplicationUser };

export const resolveAuthenticatedProfile = cache(
  async (): Promise<AuthenticatedProfile> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getClaims();
    const authUserId = data?.claims?.sub;

    if (error || !authUserId) {
      return { status: "unauthenticated" };
    }

    const profile = await getPrisma().user.findUnique({
      where: { authUserId },
      select: {
        id: true,
        authUserId: true,
        healthCenterId: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!profile) return { status: "missing-profile" };
    if (!profile.isActive) return { status: "inactive" };
    return { status: "active", user: profile };
  },
);

export async function requireApplicationUser() {
  const profile = await resolveAuthenticatedProfile();

  if (profile.status === "unauthenticated") {
    throw new ApplicationError("UNAUTHORIZED");
  }
  if (profile.status === "missing-profile") {
    throw new ApplicationError("PROFILE_NOT_FOUND");
  }
  if (profile.status === "inactive") {
    throw new ApplicationError("PROFILE_INACTIVE");
  }

  return profile.user;
}
