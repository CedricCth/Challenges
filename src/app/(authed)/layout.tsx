import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createClient } from "@/server/auth/server";
import { LogoutButton } from "@/features/auth/components/logout-button";

/**
 * Page-level guard (defence in depth, second layer per ADR-004).
 * Middleware redirects unauthenticated users earlier; this re-validates
 * with getUser() so even a buggy middleware can't leak a gated page.
 */
export default async function AuthedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Cedi <span className="text-muted-foreground">vs</span> Stefi
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/challenges"
            className="rounded-md px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            Challenges
          </Link>
          <LogoutButton />
        </nav>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
