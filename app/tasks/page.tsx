import { SquareKanban } from "lucide-react";
import { connection } from "next/server";

import { getKanbanData } from "@/app/tasks/actions";
import { KanbanView } from "@/components/kanban/kanban-view";

export default async function TasksPage() {
  // The task board is always rendered per request so it reflects the signed in
  // user and their latest boards, columns and tasks.
  await connection();

  const result = await getKanbanData();

  if (!result.ok) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 py-20 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <SquareKanban className="size-6" />
        </span>
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            The task board could not load
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  return <KanbanView initialData={result.data} />;
}
