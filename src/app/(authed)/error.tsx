"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Authed-segment error boundary. Catches render errors in any page under
 * (authed)/ — public pages have their own. POSTs a minimal report to
 * /api/log-error so it shows up in server logs.
 */
export default function AuthedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/log-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        path:
          typeof window !== "undefined" ? window.location.pathname : undefined,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }),
    }).catch(() => {
      // best-effort; if logging the error fails we don't want to recurse.
    });
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something broke.
      </h1>
      <p className="text-sm text-muted-foreground">
        It&apos;s been logged. Try again, or head back to the dashboard.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          Reference: <code>{error.digest}</code>
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <a href="/dashboard">Dashboard</a>
        </Button>
      </div>
    </main>
  );
}
