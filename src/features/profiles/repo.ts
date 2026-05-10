import "server-only";

import { inArray } from "drizzle-orm";

import type { Profile } from "@/domain/entities";
import { db } from "@/server/db/client";
import { profiles } from "@/server/db/schema";

/**
 * Tiny CRUD repo — direct Drizzle, no port (per coding-standards.md).
 */

type ProfileRow = typeof profiles.$inferSelect;

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.displayName,
    color: row.color,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
  };
}

export async function listAllProfiles(): Promise<Profile[]> {
  const rows = await db.select().from(profiles).orderBy(profiles.displayName);
  return rows.map(toProfile);
}

export async function findProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const rows = await db.select().from(profiles).where(inArray(profiles.id, ids));
  return rows.map(toProfile);
}
