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
import { WinnerSummary } from "@/features/challenges/components/winner-summary";
import { StatsChart } from "@/features/stats/components/stats-chart";
import { StatsEntriesList } from "@/features/stats/components/stats-entries-list";
import { signStatPhotoUrl } from "@/features/stats/storage";
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
  const goalMetric = challenge.goalMetric ?? strategy?.metrics[0]?.metric ?? "";
  const goalMetricSpec = strategy?.metrics.find(
    (m) => m.metric === goalMetric,
  );
  const goalUnit = goalMetricSpec?.unit ?? "";

  const participantIds = challenge.participants.map((p) => p.profileId);
  const profiles = await findProfilesByIds([
    ...new Set([...participantIds, challenge.createdBy]),
  ]);
  const profilesById = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const defaultColors = Object.fromEntries(
    profiles.map((p) => [p.id, p.color ?? "#94a3b8"]),
  );

  const allEntries = challenge.participants.flatMap((p) => p.entries);
  allEntries.sort(
    (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
  );

  // Sign photo URLs in parallel.
  const [entriesWithPhotos, signedWinnerPhotoUrl] = await Promise.all([
    Promise.all(
      allEntries.map(async (e) => ({
        ...e,
        signedPhotoUrl: await signStatPhotoUrl(e.photoUrl),
      })),
    ),
    signStatPhotoUrl(challenge.winnerPhotoUrl),
  ]);

  const metricLabels = Object.fromEntries(
    (strategy?.metrics ?? []).map((m) => [m.metric, m.label]),
  );

  const canDeclare = challenge.status !== "completed";
  const isCompleted = challenge.status === "completed";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
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

      {isCompleted && (
        <WinnerSummary
          challenge={challenge}
          strategy={strategy}
          profilesById={profilesById}
          signedWinnerPhotoUrl={signedWinnerPhotoUrl}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goal</CardTitle>
          <CardDescription className="text-xs">
            {challenge.goalDirection === "lower"
              ? "Lower is better"
              : "Higher is better"}{" "}
            · {strategy?.label ?? challenge.typeKey}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground">Metric</p>
            <p>{goalMetricSpec?.label ?? goalMetric}</p>
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
              {formatLongDay(challenge.startDate)} →{" "}
              {formatLongDay(challenge.endDate)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Progress</CardTitle>
            <CardDescription className="text-xs">
              {goalMetricSpec?.label ?? goalMetric} over time
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href={`/challenges/${challenge.id}/stats/new`}>
              + Add entry
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <StatsChart
            goalMetric={goalMetric}
            unit={goalUnit}
            participants={challenge.participants}
            profilesById={profilesById}
            defaultColors={defaultColors}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent entries</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsEntriesList
            entries={entriesWithPhotos}
            profilesById={profilesById}
            metricLabels={metricLabels}
          />
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
