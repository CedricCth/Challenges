/**
 * The shape of one notification row.
 *
 * `kind` is an enum (CHECK-enforced in SQL). When you add a new kind:
 *   1. Add it here and to the CHECK constraint in a new migration.
 *   2. Add a render branch in /news (see news-feed.tsx).
 *   3. Add the producer call wherever the underlying event happens.
 */
export type NotificationKind =
  | "stat_added"
  | "challenge_edited"
  | "winner_declared"
  | "challenge_created";

export interface NotificationRecord {
  id: string;
  recipientId: string;
  actorId: string | null;
  kind: NotificationKind;
  challengeId: string | null;
  payload: Record<string, unknown>;
  readAt: Date | null;
  emailedAt: Date | null;
  createdAt: Date;
}
