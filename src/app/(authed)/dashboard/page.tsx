import { createClient } from "@/server/auth/server";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Hi {user?.email}.
      </h1>
      <p className="text-muted-foreground">
        Real dashboard lands in Phase 7. Auth works.
      </p>
    </main>
  );
}
