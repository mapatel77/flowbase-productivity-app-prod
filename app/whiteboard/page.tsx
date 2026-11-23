import { connection } from "next/server";
import { AlertTriangle } from "lucide-react";

import { getWhiteboardsData } from "@/app/whiteboard/actions";
import { WhiteboardsView } from "@/components/whiteboard/whiteboards-view";

export const maxDuration = 30;

type WhiteboardSearchParams = Record<string, string | string[] | undefined>;

type WhiteboardPageProps = {
  // Next.js 16 exposes searchParams as a promise on server-rendered pages.
  searchParams: Promise<WhiteboardSearchParams>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseWhiteboardId(value: string | string[] | undefined) {
  const raw = firstParam(value);
  if (!raw) return null;

  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default async function WhiteboardPage({ searchParams }: WhiteboardPageProps) {
  // Whiteboards are always rendered per request so the list reflects the
  // signed in user and their latest autosaved canvases.
  await connection();

  const params = await searchParams;
  const whiteboardId = parseWhiteboardId(params.whiteboard);
  const result = await getWhiteboardsData();

  if (!result.ok) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 py-20 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </span>
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Your whiteboards could not load
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <WhiteboardsView
      initialWhiteboards={result.data}
      initialWhiteboardId={whiteboardId}
    />
  );
}
