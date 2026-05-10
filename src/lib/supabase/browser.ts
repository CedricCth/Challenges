import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components.
 * Uses only public env vars (NEXT_PUBLIC_*) — never the secret key.
 *
 * Note: this lives under `src/lib/` (not `src/server/`) because client
 * components must be allowed to import it. `src/server/*` is blocked from
 * client code by an ESLint rule (see coding-standards.md / ADR-008).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
