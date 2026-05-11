import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/server/db/client";

/**
 * Liveness + DB warmth check.
 *
 * The actual point of this endpoint (per ADR-011 and docs/07 Phase 10): an
 * external uptime ping (UptimeRobot, every 6h) hits this route, which runs a
 * trivial `select 1`. That keeps the Supabase free-tier project from auto-
 * pausing after 7 days of zero activity. Without the DB query, a pure HTTP
 * 200 from Vercel would keep Vercel warm but let Supabase sleep — exactly
 * what we wanted to prevent.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.execute(sql`select 1 as ok`);
    const ok = Array.isArray(rows)
      ? (rows[0] as { ok?: number } | undefined)?.ok === 1
      : true;
    return NextResponse.json(
      { ok, t: Date.now() },
      { status: ok ? 200 : 503 },
    );
  } catch (err) {
    console.error("[health] db check failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
