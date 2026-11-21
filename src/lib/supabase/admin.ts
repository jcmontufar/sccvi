import "server-only";

import { createClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/lib/errors/application-error";
import { getServerEnvironment } from "@/lib/env/server-env";
import { getSupabasePublicEnvironment } from "@/lib/env/public-env";

export function createSupabaseAdminClient() {
  const key = getServerEnvironment().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new ApplicationError("USER_PROVISIONING_UNAVAILABLE");
  return createClient(
    getSupabasePublicEnvironment().NEXT_PUBLIC_SUPABASE_URL,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
