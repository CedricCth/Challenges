import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type { StatEntry } from "@/domain/entities";
import type {
  AddStatInput,
  IStatsRepo,
  UpdateStatInput,
} from "@/domain/ports";
import { numericToNumber } from "@/lib/format";
import { db } from "@/server/db/client";
import { statEntries } from "@/server/db/schema";

type StatEntryRow = typeof statEntries.$inferSelect;

function toStatEntry(row: StatEntryRow): StatEntry {
  return {
    id: row.id,
    challengeId: row.challengeId,
    profileId: row.profileId,
    metric: row.metric,
    value: numericToNumber(row.value) ?? 0,
    unit: row.unit,
    recordedAt: row.recordedAt,
    note: row.note,
    photoUrl: row.photoUrl,
  };
}

export const statsRepo: IStatsRepo = {
  async add(input: AddStatInput) {
    const [row] = await db
      .insert(statEntries)
      .values({
        challengeId: input.challengeId,
        profileId: input.profileId,
        metric: input.metric,
        value: input.value.toString(),
        unit: input.unit,
        note: input.note ?? null,
        photoUrl: input.photoUrl ?? null,
        ...(input.recordedAt && { recordedAt: input.recordedAt }),
      })
      .returning();
    return toStatEntry(row);
  },

  async update(input: UpdateStatInput) {
    const [row] = await db
      .update(statEntries)
      .set({
        metric: input.metric,
        value: input.value.toString(),
        unit: input.unit,
        note: input.note,
        photoUrl: input.photoUrl,
        ...(input.recordedAt && { recordedAt: input.recordedAt }),
      })
      .where(
        and(
          eq(statEntries.id, input.id),
          eq(statEntries.profileId, input.ownerProfileId),
        ),
      )
      .returning();
    return row ? toStatEntry(row) : null;
  },

  async findOwned(id: string, ownerProfileId: string) {
    const [row] = await db
      .select()
      .from(statEntries)
      .where(
        and(
          eq(statEntries.id, id),
          eq(statEntries.profileId, ownerProfileId),
        ),
      )
      .limit(1);
    return row ? toStatEntry(row) : null;
  },

  async listForChallenge(challengeId: string) {
    const rows = await db
      .select()
      .from(statEntries)
      .where(eq(statEntries.challengeId, challengeId))
      .orderBy(asc(statEntries.recordedAt));
    return rows.map(toStatEntry);
  },
};

/**
 * Deletes a stat entry owned by `ownerProfileId`. Returns:
 *   - `null` when no row was deleted (not owner / not found),
 *   - the full deleted entity otherwise. The caller is responsible for
 *     removing the orphaned object from Supabase Storage if `photoUrl`
 *     is set, and for emitting any notification using the deleted row's
 *     metric/value/unit.
 */
export async function deleteStatEntry(
  id: string,
  ownerProfileId: string,
): Promise<StatEntry | null> {
  const [row] = await db
    .delete(statEntries)
    .where(
      and(eq(statEntries.id, id), eq(statEntries.profileId, ownerProfileId)),
    )
    .returning();
  return row ? toStatEntry(row) : null;
}
