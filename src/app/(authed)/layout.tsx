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

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/challenges", label: "Challenges" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/about-us", label: "About" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Cedi <span className="text-muted-foreground">vs</span> Stefi
          </Link>
          <nav className="order-3 flex w-full items-center gap-0.5 overflow-x-auto sm:order-2 sm:w-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2 py-1.5 text-sm whitespace-nowrap hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="order-2 sm:order-3">
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
