import { inArray } from "drizzle-orm";

import { createClient } from "@/server/auth/server";
import { db } from "@/server/db/client";
import { challenges } from "@/server/db/schema";
import { findProfilesByIds } from "@/features/profiles/repo";
import { NewsFeed } from "@/features/notifications/components/news-feed";
import { MarkAllReadButton } from "@/features/notifications/components/mark-all-read-button";
import {
  listForUser,
  markAllReadForUser,
} from "@/features/notifications/repo";

export default async function NewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const notifications = await listForUser(user.id);

  // Hydrate actor profiles + challenge titles in batch.
  const actorIds = [
    ...new Set(
      notifications
        .map((n) => n.actorId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const challengeIds = [
    ...new Set(
      notifications
        .map((n) => n.challengeId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const [actorProfiles, challengeRows] = await Promise.all([
    findProfilesByIds(actorIds),
    challengeIds.length > 0
      ? db
          .select({ id: challenges.id, title: challenges.title })
          .from(challenges)
          .where(inArray(challenges.id, challengeIds))
      : Promise.resolve([] as { id: string; title: string }[]),
  ]);
  const actorById = Object.fromEntries(actorProfiles.map((p) => [p.id, p]));
  const challengeTitleById = Object.fromEntries(
    challengeRows.map((c) => [c.id, c.title]),
  );

  const items = notifications.map((n) => ({
    notification: n,
    actor: n.actorId ? (actorById[n.actorId] ?? null) : null,
    challengeTitle: n.challengeId
      ? (challengeTitleById[n.challengeId] ?? null)
      : null,
  }));

  // Mark everything read on visit. (We render the feed with the readAt
  // state captured BEFORE this update, so "new" badges still show this turn.)
  await markAllReadForUser(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">News</h1>
          <p className="text-sm text-muted-foreground">
            Stat entries, edits, and finished challenges from the other one.
          </p>
        </div>
        <MarkAllReadButton />
      </div>
      <NewsFeed items={items} />
    </main>
  );
}
