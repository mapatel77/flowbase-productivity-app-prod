"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RoomProvider,
  useMyPresence,
  useOthers,
  useSelf,
  useThreads,
} from "@liveblocks/react";
import { Settings2 } from "lucide-react";

import { BoardCanvas } from "@/components/kanban/board-canvas";
import { BoardPresence, type PresenceUser } from "@/components/kanban/board-presence";
import { CollaborationSheet } from "@/components/kanban/collaboration-sheet";
import { TaskCommentsSheet } from "@/components/kanban/task-comments-sheet";
import { Button } from "@/components/ui/button";
import { useCollaborationEnabled } from "@/components/liveblocks/collaboration-provider";
import type {
  KanbanBoard,
  KanbanColumn,
  KanbanTask,
  KanbanViewer,
} from "@/lib/kanban/types";
import { getBoardRoomId } from "@/lib/liveblocks/rooms";

type BoardRoomProps = {
  board: KanbanBoard;
  columns: KanbanColumn[];
  tasks: KanbanTask[];
  viewer: KanbanViewer;
  onAddColumn: () => void;
  onEditColumn: (column: KanbanColumn) => void;
  onDeleteColumn: (column: KanbanColumn) => void;
  onAddTask: (columnId: number) => void;
  onOpenTask: (task: KanbanTask) => void;
  onDeleteTask: (task: KanbanTask) => void;
};

/**
 * A board owns a Liveblocks room. When Liveblocks is not configured (for
 * example a fresh local checkout) the same board renders in static mode while
 * email sharing continues to work through server actions.
 */
export function BoardRoom(props: BoardRoomProps) {
  const enabled = useCollaborationEnabled();

  if (!enabled) {
    return <StaticBoard {...props} />;
  }

  return (
    <RoomProvider
      key={props.board.id}
      id={getBoardRoomId(props.board.id)}
      initialPresence={{
        name: props.viewer.name,
        email: props.viewer.email,
        color: props.viewer.color,
        activeTaskId: null,
      }}
    >
      <LiveBoard {...props} />
    </RoomProvider>
  );
}

function useActivePresence(): PresenceUser[] {
  const self = useSelf();
  const others = useOthers();

  return useMemo(() => {
    const byUser = new Map<string, PresenceUser>();

    if (self) {
      byUser.set(self.id, {
        id: self.id,
        name: self.presence.name,
        email: self.presence.email,
        color: self.presence.color,
        activeTaskId: self.presence.activeTaskId,
        isSelf: true,
      });
    }

    for (const other of others) {
      if (byUser.has(other.id)) continue;

      byUser.set(other.id, {
        id: other.id,
        name: other.presence.name,
        email: other.presence.email,
        color: other.presence.color,
        activeTaskId: other.presence.activeTaskId,
        isSelf: false,
      });
    }

    return [...byUser.values()].sort(
      (a, b) =>
        Number(b.isSelf) - Number(a.isSelf) ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [self, others]);
}

function useCommentCounts(): Record<number, number> {
  const { threads } = useThreads();

  return useMemo(() => {
    const counts: Record<number, number> = {};

    for (const thread of threads ?? []) {
      const taskId = thread.metadata.taskId;
      if (typeof taskId !== "number") continue;
      counts[taskId] = (counts[taskId] ?? 0) + thread.comments.length;
    }

    return counts;
  }, [threads]);
}

function LiveBoard(props: BoardRoomProps) {
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [commentsTask, setCommentsTask] = useState<KanbanTask | null>(null);
  const activeUsers = useActivePresence();
  const commentCounts = useCommentCounts();
  const [, updateMyPresence] = useMyPresence();

  const canEdit = props.board.accessRole !== "viewer";

  // Keep comments in sync if the task was renamed or moved while the panel is
  // open, and close it if the task disappears.
  useEffect(() => {
    setCommentsTask((current) =>
      current
        ? props.tasks.find((task) => task.id === current.id) ?? null
        : current,
    );
  }, [props.tasks]);

  useEffect(() => {
    updateMyPresence({ activeTaskId: commentsTask?.id ?? null });

    return () => {
      updateMyPresence({ activeTaskId: null });
    };
  }, [commentsTask?.id, updateMyPresence]);

  const commentsColumn =
    props.columns.find((column) => column.id === commentsTask?.columnId)?.name ??
    "this column";

  return (
    <>
      <BoardCanvas
        board={props.board}
        columns={props.columns}
        tasks={props.tasks}
        canEdit={canEdit}
        commentCounts={commentCounts}
        onOpenComments={setCommentsTask}
        topBarActions={
          <>
            <BoardPresence users={activeUsers} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCollaborationOpen(true)}
              className="h-8 gap-1.5 rounded-lg bg-card/70"
            >
              <Settings2 className="size-3.5" />
              Collaborate
            </Button>
          </>
        }
        onAddColumn={props.onAddColumn}
        onEditColumn={props.onEditColumn}
        onDeleteColumn={props.onDeleteColumn}
        onAddTask={props.onAddTask}
        onOpenTask={props.onOpenTask}
        onDeleteTask={props.onDeleteTask}
      />

      <CollaborationSheet
        open={collaborationOpen}
        onOpenChange={setCollaborationOpen}
        board={props.board}
        viewer={props.viewer}
        activeUsers={activeUsers}
        collaborationEnabled
      />

      <TaskCommentsSheet
        key={commentsTask?.id ?? "no-task"}
        open={commentsTask !== null}
        onOpenChange={(open) => {
          if (!open) setCommentsTask(null);
        }}
        board={props.board}
        task={commentsTask}
        viewer={props.viewer}
        columnName={commentsColumn}
        canComment={canEdit}
      />
    </>
  );
}

function StaticBoard(props: BoardRoomProps) {
  const [collaborationOpen, setCollaborationOpen] = useState(false);

  return (
    <>
      <BoardCanvas
        board={props.board}
        columns={props.columns}
        tasks={props.tasks}
        canEdit={props.board.accessRole !== "viewer"}
        topBarActions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCollaborationOpen(true)}
            className="h-8 gap-1.5 rounded-lg bg-card/70"
          >
            <Settings2 className="size-3.5" />
            Collaborate
          </Button>
        }
        onAddColumn={props.onAddColumn}
        onEditColumn={props.onEditColumn}
        onDeleteColumn={props.onDeleteColumn}
        onAddTask={props.onAddTask}
        onOpenTask={props.onOpenTask}
        onDeleteTask={props.onDeleteTask}
      />

      <CollaborationSheet
        open={collaborationOpen}
        onOpenChange={setCollaborationOpen}
        board={props.board}
        viewer={props.viewer}
        activeUsers={[]}
        collaborationEnabled={false}
      />
    </>
  );
}
