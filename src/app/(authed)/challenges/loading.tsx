import { Skeleton } from "@/components/ui/skeleton";

export default function ChallengesLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border p-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </main>
  );
}
