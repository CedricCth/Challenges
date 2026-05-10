import Link from "next/link";

import { Button } from "@/components/ui/button";
import { challengeService } from "@/server/composition";
import { createClient } from "@/server/auth/server";
import { listAllProfiles } from "@/features/profiles/repo";
import { ChallengeCard } from "@/features/challenges/components/challenge-card";

export default async function ChallengesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [challenges, profiles] = await Promise.all([
    challengeService.listForUser(user.id),
    listAllProfiles(),
  ]);
  const profilesById = Object.fromEntries(profiles.map((p) => [p.id, p]));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Challenges</h1>
        <Button asChild size="sm">
          <Link href="/challenges/new">+ New challenge</Link>
        </Button>
      </div>

      {challenges.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No challenges yet.{" "}
          <Link
            href="/challenges/new"
            className="font-medium text-foreground underline"
          >
            Start your first one
          </Link>
          .
        </div>
      ) : (
        <div className="grid gap-3">
          {challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              profilesById={profilesById}
            />
          ))}
        </div>
      )}
    </main>
  );
}
