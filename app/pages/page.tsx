import { Layers } from "lucide-react";
import { connection } from "next/server";

import { getSpaceOptions, getSpacesData } from "@/app/pages/actions";
import { PagesView } from "@/components/pages/pages-view";

export const maxDuration = 30;

/** The “All Spaces” screen. */
export default async function PagesRoute() {
  // The spaces list is always rendered per request so it reflects the signed
  // in user and the newest spaces.
  await connection();

  const [spacesResult, optionsResult] = await Promise.all([
    getSpacesData(),
    getSpaceOptions(),
  ]);

  if (!spacesResult.ok) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 py-20 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Layers className="size-6" />
        </span>
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Your spaces could not load
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {spacesResult.error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PagesView
      initialSpaces={spacesResult.data.spaces}
      spaceOptions={optionsResult.ok ? optionsResult.data : []}
    />
  );
}
