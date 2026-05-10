import { notFound } from "next/navigation";

import { createClient } from "@/server/auth/server";
import { challengeService } from "@/server/composition";
import { ChallengeTypeFactory } from "@/features/challenges/factory";
import { isParticipantOrCreator } from "@/features/challenges/repo";
import { ChallengeForm } from "@/features/challenges/components/challenge-form";
import { updateChallenge } from "@/features/challenges/actions";
import { listAllProfiles } from "@/features/profiles/repo";

export default async function EditChallengePage({
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
  if (!ChallengeTypeFactory.has(challenge.typeKey)) notFound();

  const strategy = ChallengeTypeFactory.get(challenge.typeKey);
  const profiles = await listAllProfiles();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Edit challenge
      </h1>
      <ChallengeForm
        mode="edit"
        typeKey={strategy.key}
        typeLabel={strategy.label}
        metrics={strategy.metrics}
        profiles={profiles}
        currentUserId={user.id}
        initial={{
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          goalMetric: challenge.goalMetric,
          goalTarget: challenge.goalTarget,
          goalDirection: challenge.goalDirection,
          startDate: challenge.startDate,
          endDate: challenge.endDate,
        }}
        initialParticipantIds={challenge.participants.map((p) => p.profileId)}
        action={updateChallenge}
      />
    </main>
  );
}
