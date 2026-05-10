import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/server/env";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Reads/writes auth cookies via Next.js's cookies() store.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies. The middleware refreshes
            // the session for us, so we silently ignore here.
          }
        },
      },
    },
  );
}
