import { Skeleton } from "@/components/ui/skeleton";

export default function NewsLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="rounded-xl border p-6 space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-2 w-2 mt-2 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
