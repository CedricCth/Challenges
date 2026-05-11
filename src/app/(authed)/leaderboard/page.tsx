import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyStateDoodle } from "@/components/doodles";
import { createClient } from "@/server/auth/server";
import "@/server/composition";
import { listWithParticipantsForUser } from "@/features/challenges/repo";
import { computeLeaderboard } from "@/features/leaderboard/scoring";
import { listAllProfiles } from "@/features/profiles/repo";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [allChallenges, profiles] = await Promise.all([
    listWithParticipantsForUser(user.id),
    listAllProfiles(),
  ]);

  const { entries, biggestComeback, completedCount, tieCount } =
    computeLeaderboard(allChallenges, profiles);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          {completedCount === 0
            ? "No challenges finished yet."
            : `${completedCount} finished${tieCount > 0 ? ` (${tieCount} tied)` : ""}.`}
        </p>
      </div>

      {entries.length === 0 || completedCount === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-3 flex flex-col items-center">
          <EmptyStateDoodle variant="leaderboard" />
          <p className="text-sm text-muted-foreground max-w-xs">
            {entries.length === 0
              ? "No participants yet."
              : "No challenges finished yet — go declare a winner."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((e, idx) => {
            const accent = e.profile.color ?? "#94a3b8";
            return (
              <Card key={e.profile.id}>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {e.profile.displayName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {idx === 0 && e.totalWins > 0
                        ? "Leading overall"
                        : e.totalWins === 0 && completedCount > 0
                          ? "Yet to win one"
                          : ""}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-3 text-sm">
                  <Stat label="Wins" value={e.totalWins} />
                  <Stat
                    label="Win rate"
                    value={
                      completedCount > 0
                        ? `${Math.round(e.winRate * 100)}%`
                        : "—"
                    }
                  />
                  <Stat
                    label="Streak"
                    value={
                      e.longestStreak +
                      (e.onCurrentStreak && e.longestStreak > 0 ? " 🔥" : "")
                    }
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {biggestComeback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Biggest comeback</CardTitle>
            <CardDescription className="text-xs">
              The eventual winner was behind at the halfway mark.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              <Link
                href={`/challenges/${biggestComeback.challenge.id}`}
                className="font-medium hover:underline"
              >
                {biggestComeback.challenge.title}
              </Link>{" "}
              — {biggestComeback.winner.displayName} came back from a{" "}
              {Math.round(biggestComeback.midpointDeficit * 100)}% deficit at
              the midpoint.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base tabular-nums">{value}</p>
    </div>
  );
}
