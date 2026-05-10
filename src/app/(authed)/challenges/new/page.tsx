import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/server/auth/server";
import { ChallengeTypeFactory } from "@/features/challenges/factory";
import "@/server/composition";
import { ChallengeForm } from "@/features/challenges/components/challenge-form";
import { createChallenge } from "@/features/challenges/actions";
import { listAllProfiles } from "@/features/profiles/repo";

export default async function NewChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const types = ChallengeTypeFactory.list();

  // Step 1: no type selected yet — show the type picker.
  if (!type || !ChallengeTypeFactory.has(type)) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            New challenge
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick a type. Adding more is one file in the codebase.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {types.map((t) => (
            <Link
              key={t.key}
              href={`/challenges/new?type=${t.key}`}
              className="block"
            >
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardHeader>
                  <CardTitle className="text-base">{t.label}</CardTitle>
                  <CardDescription className="text-xs">
                    {t.metrics.map((m) => m.label).join(" · ")}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    );
  }

  // Step 2: type chosen — show the form.
  const strategy = ChallengeTypeFactory.get(type);
  const profiles = await listAllProfiles();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          New {strategy.label.toLowerCase()} challenge
        </h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/challenges/new" className="underline">
            Pick a different type
          </Link>
        </p>
      </div>
      <ChallengeForm
        mode="create"
        typeKey={strategy.key}
        typeLabel={strategy.label}
        metrics={strategy.metrics}
        profiles={profiles}
        currentUserId={user.id}
        action={createChallenge}
      />
    </main>
  );
}
