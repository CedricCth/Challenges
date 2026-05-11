import { Skeleton } from "@/components/ui/skeleton";

export default function ChallengeDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full max-w-prose" />
      </div>
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-5 w-20" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-56 w-full" />
      </div>
    </main>
  );
}
