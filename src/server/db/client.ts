import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/server/env";
import * as schema from "./schema";

/**
 * Drizzle client. Server-only — never import from a client component.
 *
 * IMPORTANT: SUPABASE_DB_URL connects as the `postgres` superuser, which
 * BYPASSES RLS. Repos using this client therefore do not get RLS-enforced
 * filtering for free — the calling layer must supply the correct user/scope
 * filter (e.g. `where(profileId.eq(userId))`).
 *
 * RLS still applies to queries made via the Supabase JS client (server.ts),
 * which uses the user's JWT cookie. Use that path for any read where you
 * want RLS as the third defence layer (ADR-004).
 *
 * TODO (Phase 5): consider switching to a `set local role authenticated;
 * set local request.jwt.claims = ...;` per-transaction wrapper so Drizzle
 * queries also flow through RLS.
 */
const queryClient = postgres(env.SUPABASE_DB_URL, {
  prepare: false,
  max: 1,
});

export const db = drizzle(queryClient, { schema });
