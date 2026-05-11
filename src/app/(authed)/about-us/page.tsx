import Image from "next/image";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listAllProfiles } from "@/features/profiles/repo";

export default async function AboutUsPage() {
  const profiles = await listAllProfiles();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">About us</h1>
        <p className="text-sm text-muted-foreground">
          Two people, a shared scoreboard.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {profiles.map((p) => {
          const accent = p.color ?? "#94a3b8";
          return (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                {p.avatarUrl ? (
                  <Image
                    src={p.avatarUrl}
                    alt={p.displayName}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                  >
                    {p.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <CardTitle className="text-base">{p.displayName}</CardTitle>
                  <CardDescription className="text-xs">
                    accent {accent.toUpperCase()}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                {p.bio ? (
                  <p className="whitespace-pre-wrap">{p.bio}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    No bio yet. Edit it in Settings.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
