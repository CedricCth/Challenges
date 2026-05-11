import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ChallengeWithParticipants,
  Profile,
  ScoreInput,
} from "@/domain/entities";
import type { ChallengeStrategy } from "@/features/challenges/strategy";
import { formatLocalDay } from "@/lib/format";

/**
 * Hero card for an active challenge on the dashboard. Shows both
 * participants' current scores (0..1) as accent-coloured bars and a
 * "+ Add entry" CTA. Pure presentational — accepts already-loaded
 * challenge + strategy + profiles.
 */
export function ActiveChallengeCard({
  challenge,
  strategy,
  profilesById,
}: {
  challenge: ChallengeWithParticipants;
  strategy: ChallengeStrategy | null;
  profilesById: Record<string, Profile>;
}) {
  const goalMetric = challenge.goalMetric;
  const goalTarget = challenge.goalTarget;
  const goalDirection = challenge.goalDirection;

  const canScore =
    strategy && goalMetric && goalTarget != null && goalDirection;

  const scores = canScore
    ? challenge.participants.map((p) => {
        const input: ScoreInput = {
          profileId: p.profileId,
          startingValue: p.startingValue,
          entries: p.entries,
          goal: {
            metric: goalMetric!,
            target: goalTarget!,
            direction: goalDirection!,
          },
        };
        return {
          profileId: p.profileId,
          score: strategy.computeScore(input),
          entryCount: p.entries.length,
        };
      })
    : [];

  const daysLeft = daysUntil(challenge.endDate);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">
            <Link
              href={`/challenges/${challenge.id}`}
              className="hover:underline"
            >
              {challenge.title}
            </Link>
          </CardTitle>
          <CardDescription className="text-xs">
            ends {formatLocalDay(challenge.endDate)}
            {daysLeft != null && (
              <span className="ml-1">
                · {daysLeft <= 0 ? "today" : `${daysLeft}d left`}
              </span>
            )}
          </CardDescription>
        </div>
        <Button asChild size="sm">
          <Link href={`/challenges/${challenge.id}/stats/new`}>+ Entry</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {scores.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No goal set yet.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {scores.map((s) => {
              const profile = profilesById[s.profileId];
              const accent = profile?.color ?? "#94a3b8";
              const pct = Math.round(s.score * 100);
              return (
                <li key={s.profileId} className="space-y-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">
                      {profile?.displayName ?? s.profileId.slice(0, 6)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    aria-label={`${profile?.displayName ?? "participant"} progress`}
                  >
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: accent,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.entryCount}{" "}
                    {s.entryCount === 1 ? "entry" : "entries"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function daysUntil(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(`${endDate}T23:59:59`);
  if (Number.isNaN(end.getTime())) return null;
  const diff = end.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
