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
/*
 * IMPORTANT: SUPABASE_DB_URL must point at the **transaction pooler**, not
 * the direct DB. The direct connection (`db.<ref>.supabase.co:5432`) is
 * IPv6-only as of late 2024 — Vercel serverless functions can't reach it.
 * The pooler is `aws-0-<region>.pooler.supabase.com:6543` and accepts IPv4.
 *
 * The pooler is in "transaction mode" so we disable prepared statements.
 * SSL is required by Supabase.
 *
 * max=10 lets the dashboard's parallel queries (Promise.all over
 * challenges + participants + entries + profiles) actually run in
 * parallel; with max=1 they serialise on a single connection and the
 * page wall-clock equals the sum of every round-trip. idle_timeout keeps
 * the connection warm between requests so the second click in a session
 * doesn't pay the TLS handshake again.
 */
const queryClient = postgres(env.SUPABASE_DB_URL, {
  prepare: false,
  ssl: "require",
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Override the 8s statement_timeout that Supavisor inherits from the
  // `authenticator` role (the pool's login role; the timeout sticks even
  // after the session switches to `postgres` via SET ROLE). The Supabase
  // advisor sets it so anon/authenticated REST callers can't DoS the DB
  // with long queries — but our server-side connection is trusted. Sent
  // in the Postgres StartupMessage so it applies per backend connection
  // the pooler hands out. 30s is plenty for any UI render.
  connection: {
    statement_timeout: 30000,
  },
});

export const db = drizzle(queryClient, { schema });
