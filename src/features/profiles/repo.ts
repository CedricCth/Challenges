import "server-only";

import { eq, inArray } from "drizzle-orm";

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

export async function findProfileById(id: string): Promise<Profile | null> {
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  return row ? toProfile(row) : null;
}

export interface UpdateProfileInput {
  displayName?: string;
  color?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}

export async function updateProfile(
  id: string,
  patch: UpdateProfileInput,
): Promise<Profile | null> {
  const [row] = await db
    .update(profiles)
    .set({
      ...(patch.displayName !== undefined && { displayName: patch.displayName }),
      ...(patch.color !== undefined && { color: patch.color }),
      ...(patch.avatarUrl !== undefined && { avatarUrl: patch.avatarUrl }),
      ...(patch.bio !== undefined && { bio: patch.bio }),
    })
    .where(eq(profiles.id, id))
    .returning();
  return row ? toProfile(row) : null;
}
