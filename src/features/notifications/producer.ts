import "server-only";

import { after } from "next/server";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/server/db/client";
import { challengeParticipants, notifications } from "@/server/db/schema";

import { sendDigestEmails } from "./email";
import type { NotificationKind } from "./types";

/**
 * Producer side of the producer/consumer pattern.
 *
 * Each write action (addStatEntry, updateChallenge, declareWinner,
 * createChallenge) calls this after its main effect lands. We find every
 * participant of the affected challenge EXCEPT the actor and push one
 * notification row per recipient.
 *
 * The notifications table IS the queue. Two consumers read from it:
 *   1) the /news page (in-app feed) — reads anything for the current user
 *   2) the email digest sender — runs both INLINE here via `after()` for
 *      immediate delivery, and as a daily cron retry net for anything the
 *      inline path didn't manage to send.
 *
 * Failures (DB or email) are swallowed and logged — a notification miss
 * should never block the user action from succeeding.
 */
export async function notifyChallengeParticipants(args: {
  actorId: string;
  challengeId: string;
  kind: NotificationKind;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { actorId, challengeId, kind, payload = {} } = args;

  let insertedIds: string[] = [];
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

    const inserted = await db
      .insert(notifications)
      .values(
        recipients.map((r) => ({
          recipientId: r.profileId,
          actorId,
          kind,
          challengeId,
          payload,
        })),
      )
      .returning({ id: notifications.id });
    insertedIds = inserted.map((row) => row.id);
  } catch (err) {
    console.error("[notifyChallengeParticipants] insert failed:", err);
    return;
  }

  // Fire-and-forget email send. Next.js's `after()` keeps the serverless
  // function alive long enough to do the Resend call (~300ms) *after* the
  // response has already been sent to the user — so the user-facing action
  // returns instantly while the recipient gets their email within a few
  // seconds. If this fails, tomorrow's cron sweeps up anything still
  // missing `emailed_at`.
  if (insertedIds.length > 0) {
    after(async () => {
      try {
        await sendDigestEmails({ sendForIds: insertedIds });
      } catch (err) {
        console.error("[notifyChallengeParticipants] after-send failed:", err);
      }
    });
  }
}
