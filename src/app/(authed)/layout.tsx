import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/server/auth/server";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { countUnreadForUser } from "@/features/notifications/repo";

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

  // Count unread notifications for the badge. Defensive try/catch so a DB
  // hiccup never blocks the whole header.
  let unread = 0;
  try {
    unread = await countUnreadForUser(user.id);
  } catch (err) {
    console.error("[layout] unread count failed:", err);
  }

  const navItems: { href: string; label: string; badge?: number }[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/challenges", label: "Challenges" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/news", label: "News", badge: unread },
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
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm whitespace-nowrap hover:bg-accent hover:text-accent-foreground"
              >
                <span>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="order-2 flex items-center gap-1 sm:order-3">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
