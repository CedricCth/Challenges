import "server-only";

import { and, asc, desc, eq, exists, inArray, or } from "drizzle-orm";

import { db } from "@/server/db/client";
import {
  challengeParticipants,
  challenges,
  statEntries,
} from "@/server/db/schema";

import type {
  Challenge,
  ChallengeStatus,
  ChallengeWithParticipants,
  GoalDirection,
  Participant,
  StatEntry,
} from "@/domain/entities";
import type { CreateChallengeInput, IChallengeRepo } from "@/domain/ports";
import { numericToNumber } from "@/lib/format";

// ---------------------------------------------------------------------------
// Row mappers — convert Drizzle row shape (numeric→string, snake_case) to
// the domain shape (numeric→number, camelCase). Keep the conversion in one
// place so feature code never deals with raw Drizzle types.
// ---------------------------------------------------------------------------

type ChallengeRow = typeof challenges.$inferSelect;

function toChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    typeKey: row.typeKey,
    goalMetric: row.goalMetric,
    goalTarget: numericToNumber(row.goalTarget),
    goalDirection: (row.goalDirection as GoalDirection | null) ?? null,
    status: row.status as ChallengeStatus,
    startDate: row.startDate,
    endDate: row.endDate,
    winnerId: row.winnerId,
    tie: row.tie,
    coverImageUrl: row.coverImageUrl,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

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

// ---------------------------------------------------------------------------
// Repo
//
// NOTE: SUPABASE_DB_URL connects as `postgres`, which BYPASSES RLS. Every
// query therefore filters by userId explicitly. RLS is still on in the DB
// as a defence-in-depth backstop for queries that come through the Supabase
// JS client / REST API.
// ---------------------------------------------------------------------------

async function attachParticipantsAndEntries(
  challengeRows: ChallengeRow[],
): Promise<ChallengeWithParticipants[]> {
  if (challengeRows.length === 0) return [];
  const ids = challengeRows.map((r) => r.id);

  const [partRows, entryRows] = await Promise.all([
    db
      .select()
      .from(challengeParticipants)
      .where(inArray(challengeParticipants.challengeId, ids)),
    db
      .select()
      .from(statEntries)
      .where(inArray(statEntries.challengeId, ids))
      .orderBy(asc(statEntries.recordedAt)),
  ]);

  const entriesByChallenge = new Map<string, StatEntryRow[]>();
  for (const e of entryRows) {
    const bucket = entriesByChallenge.get(e.challengeId) ?? [];
    bucket.push(e);
    entriesByChallenge.set(e.challengeId, bucket);
  }

  const partsByChallenge = new Map<
    string,
    { profileId: string; startingValue: string | null }[]
  >();
  for (const p of partRows) {
    const bucket = partsByChallenge.get(p.challengeId) ?? [];
    bucket.push({ profileId: p.profileId, startingValue: p.startingValue });
    partsByChallenge.set(p.challengeId, bucket);
  }

  return challengeRows.map((row) => {
    const challengeEntries = entriesByChallenge.get(row.id) ?? [];
    const participants: Participant[] = (partsByChallenge.get(row.id) ?? []).map(
      (p) => ({
        profileId: p.profileId,
        startingValue: numericToNumber(p.startingValue),
        entries: challengeEntries
          .filter((e) => e.profileId === p.profileId)
          .map(toStatEntry),
      }),
    );
    return { ...toChallenge(row), participants };
  });
}

/**
 * "Challenges the user can see" — used by the list page, the dashboard, and
 * the leaderboard. We use EXISTS over a subquery instead of `LEFT JOIN +
 * SELECT DISTINCT` because the latter forces the planner to deduplicate 17
 * columns including jsonb, which trips the Supabase pooler's statement
 * timeout. EXISTS hits the (profile_id) index on challenge_participants
 * cleanly.
 */
function userVisibleChallengesWhere(userId: string) {
  const participantExists = exists(
    db
      .select()
      .from(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challenges.id),
          eq(challengeParticipants.profileId, userId),
        ),
      ),
  );
  return or(eq(challenges.createdBy, userId), participantExists);
}

/**
 * Same scope as listForUser — every challenge the user can see — but
 * returns participants + entries hydrated. Used by dashboard + leaderboard.
 */
export async function listWithParticipantsForUser(
  userId: string,
): Promise<ChallengeWithParticipants[]> {
  const rows = await db
    .select()
    .from(challenges)
    .where(userVisibleChallengesWhere(userId))
    .orderBy(desc(challenges.createdAt));

  return attachParticipantsAndEntries(rows);
}

export const challengeRepo: IChallengeRepo = {
  async findById(id) {
    const [row] = await db.select().from(challenges).where(eq(challenges.id, id)).limit(1);
    if (!row) return null;

    const participantRows = await db
      .select({
        profileId: challengeParticipants.profileId,
        startingValue: challengeParticipants.startingValue,
      })
      .from(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, id));

    const entries = await db
      .select()
      .from(statEntries)
      .where(eq(statEntries.challengeId, id))
      .orderBy(statEntries.recordedAt);

    const participants: Participant[] = participantRows.map((p) => ({
      profileId: p.profileId,
      startingValue: numericToNumber(p.startingValue),
      entries: entries
        .filter((e) => e.profileId === p.profileId)
        .map(toStatEntry),
    }));

    return { ...toChallenge(row), participants } satisfies ChallengeWithParticipants;
  },

  async findActiveForUser(userId) {
    const rows = await db
      .select()
      .from(challenges)
      .where(
        and(
          inArray(challenges.status, ["planned", "active"]),
          userVisibleChallengesWhere(userId),
        ),
      )
      .orderBy(desc(challenges.createdAt));

    return rows.map(toChallenge);
  },

  async listForUser(userId) {
    const rows = await db
      .select()
      .from(challenges)
      .where(userVisibleChallengesWhere(userId))
      .orderBy(desc(challenges.createdAt));

    return rows.map(toChallenge);
  },

  async create(input: CreateChallengeInput) {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(challenges)
        .values({
          title: input.title,
          description: input.description ?? null,
          typeKey: input.typeKey,
          goalMetric: input.goalMetric ?? null,
          goalTarget: input.goalTarget?.toString() ?? null,
          goalDirection: input.goalDirection ?? null,
          status: "active",
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          metadata: input.metadata ?? { schema_version: 1 },
          createdBy: input.createdBy,
        })
        .returning();

      const uniqueParticipants = [
        ...new Set([input.createdBy, ...input.participantIds]),
      ];
      if (uniqueParticipants.length > 0) {
        await tx.insert(challengeParticipants).values(
          uniqueParticipants.map((profileId) => ({
            challengeId: row.id,
            profileId,
            startingValue: null,
          })),
        );
      }

      return toChallenge(row);
    });
  },

  async update(id, patch) {
    const [row] = await db
      .update(challenges)
      .set({
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.description !== undefined && {
          description: patch.description,
        }),
        ...(patch.goalMetric !== undefined && { goalMetric: patch.goalMetric }),
        ...(patch.goalTarget !== undefined && {
          goalTarget: patch.goalTarget?.toString() ?? null,
        }),
        ...(patch.goalDirection !== undefined && {
          goalDirection: patch.goalDirection,
        }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.startDate !== undefined && { startDate: patch.startDate }),
        ...(patch.endDate !== undefined && { endDate: patch.endDate }),
        ...(patch.metadata !== undefined && { metadata: patch.metadata }),
      })
      .where(eq(challenges.id, id))
      .returning();
    return toChallenge(row);
  },

  async declareWinner(id, { winnerId, tie }) {
    await db
      .update(challenges)
      .set({
        status: "completed",
        winnerId: tie ? null : winnerId,
        tie,
      })
      .where(eq(challenges.id, id));
  },

  async delete(id) {
    await db.delete(challenges).where(eq(challenges.id, id));
  },
};

// ---------------------------------------------------------------------------
// Helpers used by the service / actions that aren't on the port interface.
// ---------------------------------------------------------------------------

export async function isParticipantOrCreator(
  challengeId: string,
  userId: string,
): Promise<boolean> {
  const [c] = await db
    .select({ createdBy: challenges.createdBy })
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);
  if (!c) return false;
  if (c.createdBy === userId) return true;

  const [p] = await db
    .select({ id: challengeParticipants.profileId })
    .from(challengeParticipants)
    .where(
      and(
        eq(challengeParticipants.challengeId, challengeId),
        eq(challengeParticipants.profileId, userId),
      ),
    )
    .limit(1);
  return Boolean(p);
}

