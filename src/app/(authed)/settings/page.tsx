import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/server/auth/server";
import { findProfileById } from "@/features/profiles/repo";
import { ProfileForm } from "@/features/profiles/components/profile-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await findProfileById(user.id);
  if (!profile) {
    // Defence in depth — trigger should have created one, but if it didn't
    // (e.g. user created before the trigger existed and migration didn't
    // backfill), nudge to re-login which triggers the auto-create.
    redirect("/login?next=/settings");
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {user.email}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription className="text-xs">
            Shown on the dashboard, charts, leaderboard, and About Us.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm initial={profile} />
        </CardContent>
      </Card>
    </main>
  );
}
