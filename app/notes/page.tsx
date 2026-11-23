import { NotebookPen } from "lucide-react";
import { connection } from "next/server";

import { getNoteCategories, getNotesData } from "@/app/notes/actions";
import { NotesView } from "@/components/notes/notes-view";

export const maxDuration = 30;

type NotesSearchParams = Record<string, string | string[] | undefined>;

type NotesPageProps = {
  // Next.js 16 exposes searchParams as a promise on server-rendered pages.
  searchParams: Promise<NotesSearchParams>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseNoteId(value: string | string[] | undefined) {
  const raw = firstParam(value);
  if (!raw) return null;

  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default async function NotesPage({ searchParams }: NotesPageProps) {
  // Notes are always rendered per request so they reflect the signed in user
  // and the newest autosaved content.
  await connection();

  const params = await searchParams;
  const noteId = parseNoteId(params.note);
  const createRequested = firstParam(params.action) === "create";

  const [result, categoriesResult] = await Promise.all([
    getNotesData(),
    getNoteCategories(),
  ]);

  if (!result.ok) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 py-20 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <NotebookPen className="size-6" />
        </span>
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Your notes could not load
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <NotesView
      initialNotes={result.data}
      initialCategories={categoriesResult.ok ? categoriesResult.data : []}
      initialNoteId={noteId}
      createRequested={createRequested}
    />
  );
}
