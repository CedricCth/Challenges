import "server-only";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/server/db/client";
import { notifications } from "@/server/db/schema";

import type { NotificationKind, NotificationRecord } from "./types";

/**
 * Consumer side of the producer/consumer pattern. Reads + acknowledgements
 * for the /news page. Filtering by recipientId is explicit because the
 * server connection bypasses RLS (defence in depth: RLS is the third gate).
 */

type NotificationRow = typeof notifications.$inferSelect;

function toNotification(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    recipientId: row.recipientId,
    actorId: row.actorId,
    kind: row.kind as NotificationKind,
    challengeId: row.challengeId,
    payload: (row.payload as Record<string, unknown>) ?? {},
    readAt: row.readAt,
    emailedAt: row.emailedAt,
    createdAt: row.createdAt,
  };
}

export async function listForUser(
  userId: string,
  limit = 50,
): Promise<NotificationRecord[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return rows.map(toNotification);
}

export async function countUnreadForUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, userId),
        isNull(notifications.readAt),
      ),
    );
  return row?.count ?? 0;
}

export async function markAllReadForUser(userId: string): Promise<number> {
  const updated = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientId, userId),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });
  return updated.length;
}

export async function markReadForUser(
  userId: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const updated = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientId, userId),
        inArray(notifications.id, ids),
      ),
    )
    .returning({ id: notifications.id });
  return updated.length;
}
