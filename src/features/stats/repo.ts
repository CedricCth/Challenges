import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type { StatEntry } from "@/domain/entities";
import type { AddStatInput, IStatsRepo } from "@/domain/ports";
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

  async listForChallenge(challengeId: string) {
    const rows = await db
      .select()
      .from(statEntries)
      .where(eq(statEntries.challengeId, challengeId))
      .orderBy(asc(statEntries.recordedAt));
    return rows.map(toStatEntry);
  },
};

export async function deleteStatEntry(
  id: string,
  ownerProfileId: string,
): Promise<boolean> {
  const result = await db
    .delete(statEntries)
    .where(
      and(eq(statEntries.id, id), eq(statEntries.profileId, ownerProfileId)),
    )
    .returning({ id: statEntries.id });
  return result.length > 0;
}
