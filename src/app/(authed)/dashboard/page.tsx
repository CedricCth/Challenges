import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/server/auth/server";
import { ChallengeTypeFactory } from "@/features/challenges/factory";
import "@/server/composition";
import { listWithParticipantsForUser } from "@/features/challenges/repo";
import { ActiveChallengeCard } from "@/features/challenges/components/active-challenge-card";
import { listAllProfiles } from "@/features/profiles/repo";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = user.user_metadata as
    | { display_name?: string; full_name?: string; name?: string }
    | undefined;
  const displayName =
    meta?.display_name ??
    meta?.full_name ??
    meta?.name ??
    user.email?.split("@")[0] ??
    "friend";

  const [allChallenges, profiles] = await Promise.all([
    listWithParticipantsForUser(user.id),
    listAllProfiles(),
  ]);
  const profilesById = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const active = allChallenges.filter(
    (c) => c.status === "planned" || c.status === "active",
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hi {displayName}.
        </h1>
        <p className="text-sm text-muted-foreground">
          {active.length === 0
            ? "No active challenges. Start one to get going."
            : active.length === 1
              ? "1 active challenge."
              : `${active.length} active challenges.`}
        </p>
      </div>

      {active.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Nothing brewing right now.
          </p>
          <Button asChild>
            <Link href="/challenges/new">Start a challenge</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {active.map((c) => (
            <ActiveChallengeCard
              key={c.id}
              challenge={c}
              strategy={
                ChallengeTypeFactory.has(c.typeKey)
                  ? ChallengeTypeFactory.get(c.typeKey)
                  : null
              }
              profilesById={profilesById}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 text-sm">
        <Button asChild variant="outline" size="sm">
          <Link href="/challenges">All challenges</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/leaderboard">Leaderboard</Link>
        </Button>
      </div>
    </main>
  );
}
