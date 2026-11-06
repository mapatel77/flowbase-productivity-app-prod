"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { LayoutPanelLeft, Plus, SquareKanban } from "lucide-react";

import {
  createBoard,
  createColumn,
  createTask,
  deleteBoard,
  deleteColumn,
  deleteTask,
  moveTask,
  updateBoard,
  updateColumn,
  updateTask,
} from "@/app/tasks/actions";
import { BoardDialog, type BoardFormValues } from "@/components/kanban/board-dialog";
import { BoardRoom } from "@/components/kanban/board-room";
import { BoardSidebar } from "@/components/kanban/board-sidebar";
import { ColumnDialog } from "@/components/kanban/column-dialog";
import { DeleteDialog } from "@/components/kanban/delete-dialog";
import { KanbanEmpty } from "@/components/kanban/kanban-empty";
import { TaskCardBody } from "@/components/kanban/task-card";
import { TaskDialog, type TaskFormValues } from "@/components/kanban/task-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster, toast } from "@/components/ui/toast";
import type {
  KanbanBoard,
  KanbanColumn,
  KanbanData,
  KanbanTask,
} from "@/lib/kanban/types";

type BoardDialogState =
  | { mode: "create" }
  | { mode: "edit"; board: KanbanBoard };

type ColumnDialogState =
  | { mode: "create"; boardId: number }
  | { mode: "edit"; column: KanbanColumn };

type TaskDialogState =
  | { mode: "create"; columnId: number }
  | { mode: "edit"; task: KanbanTask };

type DeleteTarget =
  | { kind: "board"; board: KanbanBoard }
  | { kind: "column"; column: KanbanColumn }
  | { kind: "task"; task: KanbanTask };

type KanbanViewProps = {
  initialData: KanbanData;
};

export function KanbanView({ initialData }: KanbanViewProps) {
  const [boards, setBoards] = useState(initialData.boards);
  const [columns, setColumns] = useState(initialData.columns);
  const [tasks, setTasks] = useState(initialData.tasks);
  const [activeBoardId, setActiveBoardId] = useState<number | null>(
    initialData.boards[0]?.id ?? null,
  );

  const [boardDialog, setBoardDialog] = useState<BoardDialogState | null>(null);
  const [columnDialog, setColumnDialog] = useState<ColumnDialogState | null>(
    null,
  );
  const [taskDialog, setTaskDialog] = useState<TaskDialogState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [mobileBoardsOpen, setMobileBoardsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const activeBoard = useMemo(
    () => boards.find((board) => board.id === activeBoardId) ?? null,
    [boards, activeBoardId],
  );

  const boardColumns = useMemo(
    () =>
      columns
        .filter((column) => column.boardId === activeBoardId)
        .sort((a, b) => a.position - b.position || a.id - b.id),
    [columns, activeBoardId],
  );

  const boardTasks = useMemo(
    () => tasks.filter((task) => task.boardId === activeBoardId),
    [tasks, activeBoardId],
  );

  const taskDialogColumn = useMemo(() => {
    if (!taskDialog) return null;
    const columnId =
      taskDialog.mode === "edit" ? taskDialog.task.columnId : taskDialog.columnId;
    return columns.find((column) => column.id === columnId) ?? null;
  }, [taskDialog, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space"],
      },
    }),
  );

  /* ── boards ─────────────────────────────────────────────────────────── */

  const selectBoard = (boardId: number) => {
    setActiveBoardId(boardId);
    setMobileBoardsOpen(false);
  };

  const handleCreateBoard = async (
    values: BoardFormValues,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const result = await createBoard(values);

      if (!result.ok) {
        toast.add({
          title: "Could not create the board",
          description: result.error,
        });
        return false;
      }

      setBoards((current) => [...current, result.data.board]);
      setColumns((current) => [...current, ...result.data.columns]);
      setActiveBoardId(result.data.board.id);
      setMobileBoardsOpen(false);
      toast.add({
        title: "Board created",
        description: `${result.data.board.name} is ready for work.`,
      });
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateBoard = async (
    board: KanbanBoard,
    values: BoardFormValues,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const result = await updateBoard({
        id: board.id,
        name: values.name,
        color: values.color,
      });

      if (!result.ok) {
        toast.add({
          title: "Could not update the board",
          description: result.error,
        });
        return false;
      }

      setBoards((current) =>
        current.map((item) => (item.id === result.data.id ? result.data : item)),
      );
      return true;
    } finally {
      setBusy(false);
    }
  };

  const deleteBoardNow = async (board: KanbanBoard): Promise<boolean> => {
    setBusy(true);
    try {
      const result = await deleteBoard({ id: board.id });

      if (!result.ok) {
        toast.add({
          title: "Could not delete the board",
          description: result.error,
        });
        return false;
      }

      const remaining = boards.filter((item) => item.id !== board.id);
      setBoards(remaining);
      setColumns((current) =>
        current.filter((column) => column.boardId !== board.id),
      );
      setTasks((current) =>
        current.filter((task) => task.boardId !== board.id),
      );

      if (activeBoardId === board.id) {
        setActiveBoardId(remaining[0]?.id ?? null);
      }

      toast.add({
        title: "Board deleted",
        description: `${board.name} and its tasks were removed.`,
      });
      return true;
    } finally {
      setBusy(false);
    }
  };

  /* ── columns ────────────────────────────────────────────────────────── */

  const handleCreateColumn = async (
    boardId: number,
    name: string,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const result = await createColumn({ boardId, name });

      if (!result.ok) {
        toast.add({
          title: "Could not add the column",
          description: result.error,
        });
        return false;
      }

      setColumns((current) => [...current, result.data]);
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateColumn = async (
    column: KanbanColumn,
    name: string,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const result = await updateColumn({ id: column.id, name });

      if (!result.ok) {
        toast.add({
          title: "Could not rename the column",
          description: result.error,
        });
        return false;
      }

      setColumns((current) =>
        current.map((item) => (item.id === result.data.id ? result.data : item)),
      );
      return true;
    } finally {
      setBusy(false);
    }
  };

  const deleteColumnNow = async (column: KanbanColumn): Promise<boolean> => {
    setBusy(true);
    try {
      const result = await deleteColumn({ id: column.id });

      if (!result.ok) {
        toast.add({
          title: "Could not delete the column",
          description: result.error,
        });
        return false;
      }

      const movedById = new Map(
        result.data.movedTasks.map((task) => [task.id, task]),
      );

      setColumns((current) =>
        current.filter((item) => item.id !== column.id),
      );
      setTasks((current) =>
        current
          .map((task) => movedById.get(task.id) ?? task)
          .filter((task) => task.columnId !== column.id),
      );

      toast.add({
        title: "Column deleted",
        description:
          result.data.movedTasks.length > 0
            ? "Its tasks were moved to the first remaining column."
            : `${column.name} was removed.`,
      });
      return true;
    } finally {
      setBusy(false);
    }
  };

  /* ── tasks ──────────────────────────────────────────────────────────── */

  const handleCreateTask = async (
    columnId: number,
    values: TaskFormValues,
  ): Promise<boolean> => {
    const column = columns.find((item) => item.id === columnId);

    if (!column) {
      toast.add({
        title: "Could not add the task",
        description: "That column no longer exists.",
      });
      return false;
    }

    setBusy(true);
    try {
      const result = await createTask({
        boardId: column.boardId,
        columnId,
        ...values,
      });

      if (!result.ok) {
        toast.add({
          title: "Could not add the task",
          description: result.error,
        });
        return false;
      }

      setTasks((current) => [...current, result.data.task]);

      if (result.data.syncError) {
        toast.add({
          title: "Task saved with a sync warning",
          description: result.data.syncError,
        });
      }

      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateTask = async (
    task: KanbanTask,
    values: TaskFormValues,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const result = await updateTask({
        id: task.id,
        patch: {
          title: values.title,
          description: values.description,
          dueDate: values.dueDate,
          priority: values.priority,
          labels: values.labels,
          notesLinked: values.notesLinked,
        },
        syncCalendar: values.syncCalendar,
      });

      if (!result.ok) {
        toast.add({
          title: "Could not save the task",
          description: result.error,
        });
        return false;
      }

      setTasks((current) =>
        current.map((item) =>
          item.id === result.data.task.id ? result.data.task : item,
        ),
      );

      if (result.data.syncError) {
        toast.add({
          title: "Task saved with a sync warning",
          description: result.data.syncError,
        });
      }

      return true;
    } finally {
      setBusy(false);
    }
  };

  const deleteTaskNow = async (task: KanbanTask): Promise<boolean> => {
    setBusy(true);
    try {
      const result = await deleteTask({ id: task.id });

      if (!result.ok) {
        toast.add({
          title: "Could not delete the task",
          description: result.error,
        });
        return false;
      }

      setTasks((current) => current.filter((item) => item.id !== task.id));
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.kind === "board") {
      if (await deleteBoardNow(deleteTarget.board)) setDeleteTarget(null);
      return;
    }

    if (deleteTarget.kind === "column") {
      if (await deleteColumnNow(deleteTarget.column)) setDeleteTarget(null);
      return;
    }

    if (await deleteTaskNow(deleteTarget.task)) setDeleteTarget(null);
  };

  /* ── drag and drop ──────────────────────────────────────────────────── */

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as KanbanTask | undefined;
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);

    const task = event.active.data.current?.task as KanbanTask | undefined;
    const targetColumnId = event.over?.data.current?.columnId;

    if (
      !task ||
      typeof targetColumnId !== "number" ||
      targetColumnId === task.columnId
    ) {
      return;
    }

    const previous = task;
    const nextPosition =
      tasks
        .filter((item) => item.columnId === targetColumnId)
        .reduce((max, item) => Math.max(max, item.position), -1) + 1;

    const optimistic: KanbanTask = {
      ...task,
      columnId: targetColumnId,
      position: nextPosition,
    };

    setTasks((current) =>
      current.map((item) => (item.id === task.id ? optimistic : item)),
    );

    void (async () => {
      const result = await moveTask({ id: task.id, columnId: targetColumnId });

      if (!result.ok) {
        setTasks((current) =>
          current.map((item) => (item.id === previous.id ? previous : item)),
        );
        toast.add({
          title: "Could not move the task",
          description: result.error,
        });
        return;
      }

      setTasks((current) =>
        current.map((item) =>
          item.id === result.data.id ? result.data : item,
        ),
      );
    })();
  };

  /* ── delete copy ────────────────────────────────────────────────────── */

  const deleteCopy = useMemo(() => {
    if (!deleteTarget) {
      return { title: "", description: "", confirmLabel: "Delete" };
    }

    if (deleteTarget.kind === "board") {
      const count = tasks.filter(
        (task) => task.boardId === deleteTarget.board.id,
      ).length;

      return {
        title: `Delete ${deleteTarget.board.name}?`,
        description: `This removes the board, its columns and ${count} task${
          count === 1 ? "" : "s"
        }. Any linked Calendar entries are removed too.`,
        confirmLabel: "Delete board",
      };
    }

    if (deleteTarget.kind === "column") {
      const count = tasks.filter(
        (task) => task.columnId === deleteTarget.column.id,
      ).length;
      const target = columns
        .filter((column) => column.boardId === deleteTarget.column.boardId)
        .sort((a, b) => a.position - b.position || a.id - b.id)
        .find((column) => column.id !== deleteTarget.column.id);

      return {
        title: `Delete ${deleteTarget.column.name}?`,
        description:
          count > 0
            ? `${count} task${count === 1 ? "" : "s"} will move to ${
                target?.name ?? "the first remaining column"
              }.`
            : "This column is empty and will be removed.",
        confirmLabel: "Delete column",
      };
    }

    return {
      title: `Delete "${deleteTarget.task.title}"?`,
      description: deleteTarget.task.calendarEntryId
        ? "This also removes its linked Calendar entry."
        : "This task will be permanently removed.",
      confirmLabel: "Delete task",
    };
  }, [deleteTarget, tasks, columns]);

  /* ── render ─────────────────────────────────────────────────────────── */

  return (
    <Toaster>
      <DndContext
        id={`task-board-${activeBoard?.id ?? "default"}`}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                <SquareKanban className="size-5" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-[28px]">
                  Task board
                </h1>
                <p className="text-xs text-muted-foreground">
                  Move work across boards with a calm, colourful flow.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setMobileBoardsOpen(true)}
                className="h-9 gap-1.5 rounded-xl bg-card/70 lg:hidden"
              >
                <LayoutPanelLeft className="size-4" />
                Boards
              </Button>
              <Button
                onClick={() => setBoardDialog({ mode: "create" })}
                className="h-9 gap-1.5 rounded-xl"
              >
                <Plus className="size-4" />
                New board
              </Button>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <BoardSidebar
              boards={boards}
              columns={columns}
              tasks={tasks}
              activeBoardId={activeBoardId}
              onSelect={selectBoard}
              onCreate={() => setBoardDialog({ mode: "create" })}
              onEdit={(board) => setBoardDialog({ mode: "edit", board })}
              onDelete={(board) =>
                setDeleteTarget({ kind: "board", board })
              }
              className="cozy-card hidden min-h-0 lg:flex lg:max-h-[calc(100svh-11rem)]"
            />

            <div className="min-w-0">
              {activeBoard ? (
                <BoardRoom
                  board={activeBoard}
                  columns={boardColumns}
                  tasks={boardTasks}
                  viewer={initialData.viewer}
                  onAddColumn={() =>
                    setColumnDialog({
                      mode: "create",
                      boardId: activeBoard.id,
                    })
                  }
                  onEditColumn={(column) =>
                    setColumnDialog({ mode: "edit", column })
                  }
                  onDeleteColumn={(column) =>
                    setDeleteTarget({ kind: "column", column })
                  }
                  onAddTask={(columnId) =>
                    setTaskDialog({ mode: "create", columnId })
                  }
                  onOpenTask={(task) =>
                    setTaskDialog({ mode: "edit", task })
                  }
                  onDeleteTask={(task) =>
                    setDeleteTarget({ kind: "task", task })
                  }
                />
              ) : (
                <KanbanEmpty
                  onCreateBoard={() => setBoardDialog({ mode: "create" })}
                />
              )}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskCardBody
              task={activeTask}
              columnName={
                columns.find((column) => column.id === activeTask.columnId)
                  ?.name ?? ""
              }
              className="w-[17rem] shadow-lg ring-2 ring-primary/30"
            />
          ) : null}
        </DragOverlay>

        <Sheet open={mobileBoardsOpen} onOpenChange={setMobileBoardsOpen}>
          <SheetContent
            side="left"
            className="w-[19rem] max-w-[calc(100vw-1rem)] p-0 sm:max-w-[19rem]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Boards</SheetTitle>
              <SheetDescription>
                Choose a board or create a new one.
              </SheetDescription>
            </SheetHeader>
            <BoardSidebar
              boards={boards}
              columns={columns}
              tasks={tasks}
              activeBoardId={activeBoardId}
              onSelect={selectBoard}
              onCreate={() => {
                setMobileBoardsOpen(false);
                setBoardDialog({ mode: "create" });
              }}
              onEdit={(board) => {
                setMobileBoardsOpen(false);
                setBoardDialog({ mode: "edit", board });
              }}
              onDelete={(board) => {
                setMobileBoardsOpen(false);
                setDeleteTarget({ kind: "board", board });
              }}
              className="h-full p-4 pt-12"
            />
          </SheetContent>
        </Sheet>

        <BoardDialog
          key={
            boardDialog
              ? boardDialog.mode === "edit"
                ? `edit-board-${boardDialog.board.id}`
                : "create-board"
              : "board-closed"
          }
          open={boardDialog !== null}
          onOpenChange={(open) => {
            if (!open) setBoardDialog(null);
          }}
          board={boardDialog?.mode === "edit" ? boardDialog.board : null}
          busy={busy}
          onSubmit={(values) =>
            boardDialog?.mode === "edit"
              ? handleUpdateBoard(boardDialog.board, values)
              : handleCreateBoard(values)
          }
        />

        <ColumnDialog
          key={
            columnDialog
              ? columnDialog.mode === "edit"
                ? `edit-column-${columnDialog.column.id}`
                : `create-column-${columnDialog.boardId}`
              : "column-closed"
          }
          open={columnDialog !== null}
          onOpenChange={(open) => {
            if (!open) setColumnDialog(null);
          }}
          column={columnDialog?.mode === "edit" ? columnDialog.column : null}
          columnCount={
            columnDialog
              ? columns.filter(
                  (column) =>
                    column.boardId ===
                    (columnDialog.mode === "edit"
                      ? columnDialog.column.boardId
                      : columnDialog.boardId),
                ).length
              : 0
          }
          busy={busy}
          onSubmit={(name) =>
            columnDialog?.mode === "edit"
              ? handleUpdateColumn(columnDialog.column, name)
              : columnDialog
                ? handleCreateColumn(columnDialog.boardId, name)
                : Promise.resolve(false)
          }
        />

        <TaskDialog
          key={
            taskDialog
              ? taskDialog.mode === "edit"
                ? `edit-task-${taskDialog.task.id}`
                : `create-task-${taskDialog.columnId}`
              : "task-closed"
          }
          open={taskDialog !== null}
          onOpenChange={(open) => {
            if (!open) setTaskDialog(null);
          }}
          task={taskDialog?.mode === "edit" ? taskDialog.task : null}
          columnName={taskDialogColumn?.name ?? "this column"}
          busy={busy}
          onSubmit={(values) => {
            if (!taskDialog) return Promise.resolve(false);

            return taskDialog.mode === "edit"
              ? handleUpdateTask(taskDialog.task, values)
              : handleCreateTask(taskDialog.columnId, values);
          }}
          onDelete={deleteTaskNow}
        />

        <DeleteDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={deleteCopy.title}
          description={deleteCopy.description}
          confirmLabel={deleteCopy.confirmLabel}
          busy={busy}
          onConfirm={() => {
            void handleConfirmDelete();
          }}
        />
      </DndContext>
    </Toaster>
  );
}
