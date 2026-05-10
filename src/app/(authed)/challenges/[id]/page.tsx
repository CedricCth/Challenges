import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/server/auth/server";
import { challengeService } from "@/server/composition";
import { ChallengeTypeFactory } from "@/features/challenges/factory";
import { isParticipantOrCreator } from "@/features/challenges/repo";
import { findProfilesByIds } from "@/features/profiles/repo";
import { DeclareWinnerDialog } from "@/features/challenges/components/declare-winner-dialog";
import { WinnerBadge } from "@/features/challenges/components/winner-badge";
import { formatLongDay, formatNumber } from "@/lib/format";

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (!(await isParticipantOrCreator(id, user.id))) {
    notFound();
  }

  const challenge = await challengeService.findById(id);
  if (!challenge) notFound();

  const strategy = ChallengeTypeFactory.has(challenge.typeKey)
    ? ChallengeTypeFactory.get(challenge.typeKey)
    : null;
  const goalMetricLabel =
    strategy?.metrics.find((m) => m.metric === challenge.goalMetric)?.label ??
    challenge.goalMetric ??
    "—";
  const goalUnit =
    strategy?.metrics.find((m) => m.metric === challenge.goalMetric)?.unit ?? "";

  const participantIds = challenge.participants.map((p) => p.profileId);
  const profiles = await findProfilesByIds([
    ...new Set([...participantIds, challenge.createdBy]),
  ]);
  const profilesById = Object.fromEntries(profiles.map((p) => [p.id, p]));

  const canDeclare = challenge.status !== "completed";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {challenge.title}
            </h1>
            <WinnerBadge challenge={challenge} profilesById={profilesById} />
          </div>
          {challenge.description && (
            <p className="text-sm text-muted-foreground max-w-prose">
              {challenge.description}
            </p>
          )}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/challenges/${challenge.id}/edit`}>Edit</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goal</CardTitle>
          <CardDescription className="text-xs">
            {challenge.goalDirection === "lower" ? "Lower is better" : "Higher is better"}{" "}
            · {strategy?.label ?? challenge.typeKey}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground">Metric</p>
            <p>{goalMetricLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Target change</p>
            <p>
              {formatNumber(challenge.goalTarget)} {goalUnit}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Window</p>
            <p>
              {formatLongDay(challenge.startDate)} → {formatLongDay(challenge.endDate)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {challenge.participants.length === 0 ? (
            <p className="text-muted-foreground">No participants yet.</p>
          ) : (
            challenge.participants.map((p) => {
              const profile = profilesById[p.profileId];
              return (
                <div
                  key={p.profileId}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="font-medium">
                    {profile?.displayName ?? p.profileId.slice(0, 8)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.entries.length}{" "}
                    {p.entries.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {canDeclare && (
        <div className="flex justify-end">
          <DeclareWinnerDialog
            challengeId={challenge.id}
            participants={challenge.participants
              .map((p) => profilesById[p.profileId])
              .filter((p): p is NonNullable<typeof p> => Boolean(p))}
          />
        </div>
      )}
    </main>
  );
}
