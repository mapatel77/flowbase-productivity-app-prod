import { NotebookPen } from "lucide-react";
import { connection } from "next/server";

import { getNotesData } from "@/app/notes/actions";
import { NotesView } from "@/components/notes/notes-view";

export const maxDuration = 30;

export default async function NotesPage() {
  // Notes are always rendered per request so they reflect the signed in user
  // and the newest autosaved content.
  await connection();

  const result = await getNotesData();

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

  return <NotesView initialNotes={result.data} />;
}
