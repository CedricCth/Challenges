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
import { challengeService, statsService } from "@/server/composition";
import { ChallengeTypeFactory } from "@/features/challenges/factory";
import { isParticipantOrCreator } from "@/features/challenges/repo";
import { editStatEntry } from "@/features/stats/actions";
import { StatsForm } from "@/features/stats/components/stats-form";
import { signStatPhotoUrl } from "@/features/stats/storage";

export default async function EditStatEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id, entryId } = await params;
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

  // findOwnedEntry returns null for someone else's entry — that's how we
  // protect against URL-tampering (T10 in the user test guide).
  const entry = await statsService.findOwnedEntry(entryId, user.id);
  if (!entry || entry.challengeId !== id) {
    notFound();
  }

  const strategy = ChallengeTypeFactory.get(challenge.typeKey);
  const signedPhotoUrl = await signStatPhotoUrl(entry.photoUrl);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Edit entry</h1>
        <p className="text-sm text-muted-foreground">
          <Link href={`/challenges/${id}`} className="underline">
            ← {challenge.title}
          </Link>
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Edit {strategy.label} entry
          </CardTitle>
          <CardDescription className="text-xs">
            Fix anything that wasn’t quite right.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatsForm
            challengeId={id}
            metrics={strategy.metrics}
            action={editStatEntry}
            cancelHref={`/challenges/${id}`}
            defaults={{
              entryId: entry.id,
              metric: entry.metric,
              value: entry.value,
              note: entry.note,
              recordedAt: entry.recordedAt.toISOString(),
              existingPhotoUrl: entry.photoUrl,
              signedPhotoUrl,
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
