import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicEnvironment } from "@/lib/env/public-env";

export async function createServerSupabaseClient(responseHeaders?: Headers) {
  const environment = getSupabasePublicEnvironment();
  const cookieStore = await cookies();

  return createServerClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });

            if (responseHeaders) {
              Object.entries(headers).forEach(([name, value]) => {
                responseHeaders.set(name, value);
              });
            }
          } catch {
            // Server Components cannot write cookies. Authentication flows
            // must perform refreshes in a response-capable context.
          }
        },
      },
    },
  );
}
