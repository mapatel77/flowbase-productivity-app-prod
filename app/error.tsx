"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("Dashboard failed to render", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center py-12">
      <div className="cozy-card w-full p-6 text-center sm:p-8">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
          The dashboard needs another try
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          We could not load your workspace overview. Your work is still safe, so
          retry when you are ready.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            className="h-9 rounded-xl px-4"
            onClick={reset}
            render={<RefreshCw className="size-4" aria-hidden="true" />}
          >
            Retry dashboard
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-xl bg-card/70 px-4"
            onClick={() => window.location.reload()}
          >
            Reload page
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-5 text-[11px] text-muted-foreground/70">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
