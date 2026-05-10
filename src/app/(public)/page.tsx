import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Cedi <span className="text-muted-foreground">vs</span> Stefi
        </h1>
        <p className="max-w-md text-muted-foreground">
          Our private little arena.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/login">Log in</Link>
      </Button>
    </main>
  );
}
