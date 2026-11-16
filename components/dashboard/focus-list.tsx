"use client";

import { Circle, CircleCheckBig, Flag } from "lucide-react";
import { useState } from "react";

import { moveTask } from "@/app/tasks/actions";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { FocusTask } from "@/components/dashboard/focus-data";

type FocusListProps = {
  initialTasks: FocusTask[];
  /** The current weekday, resolved on the server to avoid hydration drift. */
  weekday: string;
};

export function FocusList({ initialTasks, weekday }: FocusListProps) {
  const [tasks, setTasks] = useState<FocusTask[]>(initialTasks);
  const [busyId, setBusyId] = useState<number | null>(null);

  const toggleTask = async (task: FocusTask) => {
    if (busyId !== null) return;

    const targetColumnId = task.done ? task.todoColumnId : task.doneColumnId;
    if (targetColumnId === null) return;

    const nextDone = !task.done;

    setBusyId(task.id);
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, done: nextDone } : item,
      ),
    );

    try {
      const result = await moveTask({ id: task.id, columnId: targetColumnId });

      if (!result.ok) {
        setTasks((current) =>
          current.map((item) =>
            item.id === task.id ? { ...item, done: task.done } : item,
          ),
        );
        toast.add({
          title: "Could not update the task",
          description: result.error,
          type: "error",
        });
      }
    } catch (error) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, done: task.done } : item,
        ),
      );
      console.error("Task update failed", error);
    } finally {
      setBusyId(null);
    }
  };

  const completed = tasks.filter((task) => task.done).length;

  return (
    <section className="cozy-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">
            Today&apos;s focus
          </h2>
          <p className="text-xs text-muted-foreground">
            {tasks.length === 0
              ? "Nothing scheduled yet"
              : `${completed} of ${tasks.length} done · ${tasks.length - completed} left`}
          </p>
        </div>
        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
          {weekday}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border/80 px-3 py-6 text-center text-[12px] text-muted-foreground">
          Add a task on a board and it will show up here.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-1.5">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => void toggleTask(task)}
                disabled={busyId !== null}
                aria-pressed={task.done}
                className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-accent/60 disabled:opacity-70"
              >
                {task.done ? (
                  <CircleCheckBig className="size-[18px] shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="size-[18px] shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                )}

                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    task.done && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </span>

                <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
                  <span className={cn("size-1.5 rounded-full", task.tone)} />
                  {task.project}
                </span>

                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 text-[11px] font-medium",
                    task.done
                      ? "text-emerald-600"
                      : task.dueState === "overdue"
                        ? "text-destructive"
                        : "text-muted-foreground",
                  )}
                >
                  <Flag className="size-3" />
                  {task.due}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
