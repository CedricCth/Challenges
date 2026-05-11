import { Skeleton } from "@/components/ui/skeleton";

export default function LeaderboardLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
