import { createClient } from "@/server/auth/server";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Stopgap until Phase 3 ships the `profiles` table with `display_name`.
  // Reads Supabase user_metadata; falls back to the email local-part.
  const meta = user?.user_metadata as
    | { display_name?: string; full_name?: string; name?: string }
    | undefined;
  const displayName =
    meta?.display_name ??
    meta?.full_name ??
    meta?.name ??
    user?.email?.split("@")[0] ??
    "friend";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Hi {displayName}.
      </h1>
      <p className="text-muted-foreground">
        Real dashboard lands in Phase 7. Auth works.
      </p>
    </main>
  );
}
