"use client";

import { useState } from "react";
import { Circle, CircleCheckBig, Flag } from "lucide-react";

import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  project: string;
  due: string;
  tone: string;
  done: boolean;
};

const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Finalise the Q4 roadmap board",
    project: "Product Roadmap",
    due: "10:00",
    tone: "bg-indigo-500",
    done: false,
  },
  {
    id: "task-2",
    title: "Review the launch retro notes",
    project: "Q4 Launch",
    due: "13:30",
    tone: "bg-rose-500",
    done: false,
  },
  {
    id: "task-3",
    title: "Reply to design feedback",
    project: "Team Wiki",
    due: "16:00",
    tone: "bg-amber-500",
    done: false,
  },
  {
    id: "task-4",
    title: "Weekly planning with the team",
    project: "Product Roadmap",
    due: "Done",
    tone: "bg-emerald-500",
    done: true,
  },
];

export function FocusList() {
  const [tasks, setTasks] = useState(initialTasks);

  const toggleTask = (id: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    );
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
            {completed} of {tasks.length} done · {tasks.length - completed} left
          </p>
        </div>
        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
          Tuesday
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-1.5">
        {tasks.map((task) => (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => toggleTask(task.id)}
              aria-pressed={task.done}
              className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-accent/60"
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
                  task.done ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                <Flag className="size-3" />
                {task.due}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
