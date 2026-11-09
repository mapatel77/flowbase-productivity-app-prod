import { Skeleton } from "@/components/ui/skeleton";

export default function NotesLoading() {
  return (
    <div className="flex h-[calc(100svh-6.5rem)] min-h-[32rem] overflow-hidden md:h-[calc(100svh-7.5rem)]">
      <div className="hidden w-72 shrink-0 flex-col gap-3 border-r border-border/60 p-4 lg:flex xl:w-80">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <Skeleton className="mt-1 h-px w-full" />
        <div className="mt-2 flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2.5 px-1 py-1.5">
              <Skeleton className="size-3.5 shrink-0 rounded-sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto border-t border-border/60 pt-3">
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-3xl px-4 pt-4 md:px-8 md:pt-5">
          <div className="flex items-start gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="size-7 rounded-md" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 py-2 md:px-8">
          <div className="flex gap-2 border-b border-border/40 pb-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="size-7 rounded-md" />
            ))}
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 pb-10 pt-6 md:px-8">
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}
