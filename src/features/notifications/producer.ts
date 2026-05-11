import "server-only";

import { and, eq, ne } from "drizzle-orm";

import { db } from "@/server/db/client";
import { challengeParticipants, notifications } from "@/server/db/schema";

import type { NotificationKind } from "./types";

/**
 * Producer side of the producer/consumer pattern.
 *
 * Each write action (addStatEntry, updateChallenge, declareWinner,
 * createChallenge) calls this after its main effect lands. We find every
 * participant of the affected challenge EXCEPT the actor and push one
 * notification row per recipient. The notifications table IS the queue —
 * the /news page is one consumer; a future email worker (docs/10) is another.
 *
 * Failures are swallowed (logged, not thrown): a notification miss should
 * never block the underlying action from succeeding for the user.
 */
export async function notifyChallengeParticipants(args: {
  actorId: string;
  challengeId: string;
  kind: NotificationKind;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { actorId, challengeId, kind, payload = {} } = args;
  try {
    const recipients = await db
      .select({ profileId: challengeParticipants.profileId })
      .from(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          ne(challengeParticipants.profileId, actorId),
        ),
      );

    if (recipients.length === 0) return;

    await db.insert(notifications).values(
      recipients.map((r) => ({
        recipientId: r.profileId,
        actorId,
        kind,
        challengeId,
        payload,
      })),
    );
  } catch (err) {
    console.error("[notifyChallengeParticipants] failed:", err);
  }
}
