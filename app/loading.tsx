import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-40 rounded-2xl ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-8"
      aria-label="Loading dashboard"
      aria-busy="true"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3.5 w-64 max-w-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton className="h-96" />
        <CardSkeleton className="h-96" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <CardSkeleton className="h-80" />
        <CardSkeleton className="h-80" />
      </div>
    </div>
  );
}
