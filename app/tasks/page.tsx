import { SquareKanban } from "lucide-react";
import { connection } from "next/server";

import { getKanbanData } from "@/app/tasks/actions";
import { KanbanView } from "@/components/kanban/kanban-view";

type TasksPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  // The task board is always rendered per request so it reflects the signed in
  // user and their latest boards, columns and tasks.
  await connection();

  const params = searchParams ? await searchParams : {};
  const rawBoardId = firstParam(params.board);
  const parsedBoardId = rawBoardId ? Number(rawBoardId) : Number.NaN;
  const initialBoardId =
    Number.isInteger(parsedBoardId) && parsedBoardId > 0
      ? parsedBoardId
      : null;
  const initialAction = firstParam(params.action);
  const openTaskOnLoad = initialAction === "create-task";

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

  return (
    <KanbanView
      initialData={result.data}
      initialBoardId={initialBoardId}
      openTaskOnLoad={openTaskOnLoad}
    />
  );
}
