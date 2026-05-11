import Link from "next/link";
import { notFound } from "next/navigation";

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
import { StatsForm } from "@/features/stats/components/stats-form";

export default async function NewStatEntryPage({
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
  if (!challenge || !ChallengeTypeFactory.has(challenge.typeKey)) {
    notFound();
  }

  const strategy = ChallengeTypeFactory.get(challenge.typeKey);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Add an entry</h1>
        <p className="text-sm text-muted-foreground">
          <Link href={`/challenges/${id}`} className="underline">
            ← {challenge.title}
          </Link>
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New {strategy.label} entry</CardTitle>
          <CardDescription className="text-xs">
            Pick a metric, enter today&apos;s value.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatsForm
            challengeId={id}
            metrics={strategy.metrics}
            defaultMetric={challenge.goalMetric ?? undefined}
          />
        </CardContent>
      </Card>
    </main>
  );
}
