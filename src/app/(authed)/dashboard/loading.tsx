import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-5/6" />
          </div>
        ))}
      </div>
    </main>
  );
}
