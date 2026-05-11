import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyStateDoodle } from "@/components/doodles";
import type { Profile } from "@/domain/entities";

import type { NotificationRecord } from "../types";

interface NewsItem {
  notification: NotificationRecord;
  actor: Profile | null;
  challengeTitle: string | null;
}

export function NewsFeed({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center space-y-3 flex flex-col items-center">
        <EmptyStateDoodle variant="news" />
        <p className="text-sm text-muted-foreground max-w-xs">
          Nothing yet. When the other one logs an entry or edits a challenge,
          you&apos;ll see it here.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {items.map(({ notification, actor, challengeTitle }) => {
          const isUnread = !notification.readAt;
          return (
            <div
              key={notification.id}
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span
                className={
                  isUnread
                    ? "mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-primary"
                    : "mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-muted"
                }
                aria-hidden
              />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm">
                  {renderLine(notification, actor, challengeTitle)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeAgo(notification.createdAt)}
                </p>
              </div>
              {isUnread && (
                <Badge variant="secondary" className="shrink-0">
                  new
                </Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function renderLine(
  n: NotificationRecord,
  actor: Profile | null,
  challengeTitle: string | null,
): React.ReactNode {
  const actorName = actor?.displayName ?? "Someone";
  const challengeLink = n.challengeId ? (
    <Link
      href={`/challenges/${n.challengeId}`}
      className="font-medium hover:underline"
    >
      {challengeTitle ?? "a challenge"}
    </Link>
  ) : (
    <span className="font-medium">{challengeTitle ?? "a challenge"}</span>
  );

  switch (n.kind) {
    case "stat_added": {
      const metric = n.payload.metric as string | undefined;
      const value = n.payload.value as number | undefined;
      const unit = n.payload.unit as string | undefined;
      return (
        <>
          <strong>{actorName}</strong> logged{" "}
          {value != null && (
            <>
              <span className="tabular-nums">{value}</span>{" "}
              {unit && <span className="text-muted-foreground">{unit}</span>}
              {metric && (
                <span className="text-muted-foreground"> for {metric}</span>
              )}{" "}
            </>
          )}
          on {challengeLink}.
        </>
      );
    }
    case "challenge_edited":
      return (
        <>
          <strong>{actorName}</strong> edited {challengeLink}.
        </>
      );
    case "winner_declared": {
      const isTie = Boolean(n.payload.tie);
      return (
        <>
          <strong>{actorName}</strong>{" "}
          {isTie ? "called " : "declared a winner for "}
          {challengeLink}
          {isTie ? " a tie" : ""}.
        </>
      );
    }
    case "challenge_created":
      return (
        <>
          <strong>{actorName}</strong> started a new challenge:{" "}
          {challengeLink}.
        </>
      );
    default:
      return (
        <>
          <strong>{actorName}</strong> did something on {challengeLink}.
        </>
      );
  }
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}
