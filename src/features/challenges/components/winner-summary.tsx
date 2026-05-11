import Image from "next/image";

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
import { formatLongDay } from "@/lib/format";

/**
 * Shown on a completed challenge's detail page. Wraps the winner's note,
 * optional victory photo, and the final progress score for each participant
 * so you can see how it ended at a glance.
 */
export function WinnerSummary({
  challenge,
  strategy,
  profilesById,
  signedWinnerPhotoUrl,
}: {
  challenge: ChallengeWithParticipants;
  strategy: ChallengeStrategy | null;
  profilesById: Record<string, Profile>;
  signedWinnerPhotoUrl: string | null;
}) {
  const goal =
    strategy &&
    challenge.goalMetric &&
    challenge.goalTarget != null &&
    challenge.goalDirection
      ? {
          metric: challenge.goalMetric,
          target: challenge.goalTarget,
          direction: challenge.goalDirection,
        }
      : null;

  const finals = goal
    ? challenge.participants
        .map((p) => {
          const input: ScoreInput = {
            profileId: p.profileId,
            startingValue: p.startingValue,
            entries: p.entries,
            goal,
          };
          return {
            profileId: p.profileId,
            score: strategy!.computeScore(input),
          };
        })
        .sort((a, b) => b.score - a.score)
    : [];

  const headline = challenge.tie
    ? "It's a tie."
    : challenge.winnerId
      ? `${profilesById[challenge.winnerId]?.displayName ?? "The winner"} took it.`
      : "Completed.";

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader>
        <CardTitle className="text-base">{headline}</CardTitle>
        <CardDescription className="text-xs">
          Ended {formatLongDay(challenge.endDate)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenge.winnerNote && (
          <p className="whitespace-pre-wrap text-sm">{challenge.winnerNote}</p>
        )}
        {signedWinnerPhotoUrl && (
          <a
            href={signedWinnerPhotoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Image
              src={signedWinnerPhotoUrl}
              alt="Victory photo"
              width={800}
              height={600}
              className="h-auto w-full max-h-80 rounded-md object-cover"
              unoptimized
            />
          </a>
        )}
        {finals.length > 0 && (
          <ul className="space-y-2 pt-2 text-sm">
            {finals.map((f) => {
              const profile = profilesById[f.profileId];
              const accent = profile?.color ?? "#94a3b8";
              const pct = Math.round(f.score * 100);
              return (
                <li key={f.profileId} className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium">
                      {profile?.displayName ?? f.profileId.slice(0, 6)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: accent,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
