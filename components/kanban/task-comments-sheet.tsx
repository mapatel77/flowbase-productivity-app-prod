"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useCreateComment, useCreateThread, useThreads, useUser } from "@liveblocks/react";
import type { CommentData } from "@liveblocks/client";
import {
  CalendarDays,
  Flag,
  Loader2,
  MessageSquare,
  Reply,
  Send,
  Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { isColorToken, categoryTones } from "@/lib/calendar/colors";
import { commentBodyToText, textToCommentBody } from "@/lib/liveblocks/comment-body";
import { getUserColor, getUserInitials } from "@/lib/liveblocks/user-color";
import { PRIORITY_LABELS } from "@/lib/kanban/constants";
import type { KanbanBoard, KanbanTask, KanbanViewer } from "@/lib/kanban/types";
import { cn } from "@/lib/utils";

type TaskCommentsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: KanbanBoard;
  task: KanbanTask | null;
  viewer: KanbanViewer;
  columnName: string;
  canComment: boolean;
};

const COMMENT_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type CommentNode = {
  comment: CommentData;
  replies: CommentNode[];
};

function getReplyTargetId(comment: CommentData): string | null {
  const id = comment.metadata?.replyToCommentId;
  return typeof id === "string" && id ? id : null;
}

/** True when `ancestor` sits somewhere up the reply chain of `node`. */
function isReplyAncestor(
  ancestor: CommentNode,
  node: CommentNode,
  nodes: Map<string, CommentNode>,
): boolean {
  let current: CommentNode | undefined = node;
  let guard = 0;

  // The guard avoids an endless walk if reply metadata ever forms a cycle.
  while (current && guard < 100) {
    if (current === ancestor) return true;
    const targetId = getReplyTargetId(current.comment);
    current = targetId ? nodes.get(targetId) : undefined;
    guard += 1;
  }

  return false;
}

/** Groups a flat Liveblocks thread into comments and their nested replies. */
function buildCommentTree(comments: CommentData[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();
  const ordered: CommentNode[] = [];

  for (const comment of comments) {
    if (comment.deletedAt) continue;
    const node: CommentNode = { comment, replies: [] };
    nodes.set(comment.id, node);
    ordered.push(node);
  }

  const roots: CommentNode[] = [];

  for (const node of ordered) {
    const targetId = getReplyTargetId(node.comment);
    const parent = targetId ? nodes.get(targetId) : undefined;
    const safeParent =
      parent && parent !== node && !isReplyAncestor(node, parent, nodes)
        ? parent
        : undefined;

    if (safeParent) {
      safeParent.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

type CommentComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  replyToName?: string;
  onCancelReply?: () => void;
  autoFocus?: boolean;
};

function CommentComposer({
  value,
  onChange,
  onSubmit,
  replyToName,
  onCancelReply,
  autoFocus = false,
}: CommentComposerProps) {
  const isReply = Boolean(replyToName);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-2"
    >
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder={
          isReply
            ? `Reply to ${replyToName}…`
            : "Write a comment… Use Shift + Enter for a new line."
        }
        rows={isReply ? 2 : 3}
        autoFocus={autoFocus}
        className="resize-none rounded-xl bg-background"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground">
          {isReply
            ? "This reply will appear under the comment."
            : "Comments update for everyone in real time."}
        </p>
        <div className="flex items-center gap-1.5">
          {isReply ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
              className="h-8 rounded-lg"
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            size="sm"
            disabled={!value.trim()}
            className="h-8 gap-1.5 rounded-lg"
          >
            {isReply ? <Reply className="size-3.5" /> : <Send className="size-3.5" />}
            {isReply ? "Reply" : "Send"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function CommentThreadItem({
  node,
  viewer,
  onReply,
  replyToId,
  replyComposer,
}: {
  node: CommentNode;
  viewer: KanbanViewer;
  onReply?: (commentId: string, authorName: string) => void;
  replyToId: string | null;
  replyComposer: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <CommentRow comment={node.comment} viewer={viewer} onReply={onReply} />

      {replyToId === node.comment.id ? (
        <div className="ml-9">{replyComposer}</div>
      ) : null}

      {node.replies.length > 0 ? (
        <div className="ml-4 flex flex-col gap-3 border-l border-border/60 pl-3">
          {node.replies.map((reply) => (
            <CommentThreadItem
              key={reply.comment.id}
              node={reply}
              viewer={viewer}
              onReply={onReply}
              replyToId={replyToId}
              replyComposer={replyComposer}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CommentRow({
  comment,
  viewer,
  onReply,
}: {
  comment: CommentData;
  viewer: KanbanViewer;
  onReply?: (commentId: string, authorName: string) => void;
}) {
  const { user } = useUser(comment.userId);
  const info = user;
  const email = info?.email ?? `${comment.userId}@liveblocks`;
  const name = info?.name ?? `User ${comment.userId}`;
  const rawColor = info?.color;
  const color = isColorToken(rawColor)
    ? rawColor
    : getUserColor(comment.userId || email);
  const isSelf = comment.userId === String(viewer.id);

  if (comment.deletedAt) return null;

  return (
    <article className="flex gap-2.5">
      <Avatar size="sm" className="mt-0.5">
        <AvatarFallback className={cn("text-[10px] font-semibold", categoryTones[color].chip)}>
          {getUserInitials(name, email)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="truncate text-[12px] font-semibold">
            {name}
            {isSelf ? " (you)" : ""}
          </p>
          <time
            dateTime={new Date(comment.createdAt).toISOString()}
            className="text-[10px] text-muted-foreground"
          >
            {COMMENT_TIME_FORMAT.format(new Date(comment.createdAt))}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-muted-foreground">
          {commentBodyToText(comment.body)}
        </p>

        {onReply ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onReply(comment.id, name)}
            className="mt-2 h-7 gap-1.5 px-2 text-[11px] text-muted-foreground"
          >
            <Reply className="size-3" />
            Reply
          </Button>
        ) : null}
      </div>
    </article>
  );
}

type TaskDetailProps = {
  task: KanbanTask;
  columnName: string;
};

function TaskDetail({ task, columnName }: TaskDetailProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-muted/25 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-sky-400" />
        <div className="min-w-0">
          <p className="break-words text-[13px] font-semibold">{task.title}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{columnName}</p>
        </div>
      </div>

      {task.description ? (
        <p className="line-clamp-3 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Flag className="size-2.5" />
          {PRIORITY_LABELS[task.priority]}
        </span>
        {task.dueDate ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <CalendarDays className="size-2.5" />
            {task.dueDate}
          </span>
        ) : null}
        {task.labels.slice(0, 3).map((label, index) => (
          <span
            key={`${label.name}-${index}`}
            className={cn(
              "inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
              categoryTones[label.color].chip,
            )}
          >
            <span className="truncate">{label.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function TaskCommentsSheet({
  open,
  onOpenChange,
  board,
  task,
  viewer,
  columnName,
  canComment,
}: TaskCommentsSheetProps) {
  const { threads, isLoading, error } = useThreads();
  const createThread = useCreateThread();
  const createComment = useCreateComment();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<{
    commentId: string;
    authorName: string;
  } | null>(null);

  const thread = useMemo(
    () =>
      task
        ? threads?.find(
            (item) =>
              item.metadata.boardId === board.id &&
              item.metadata.taskId === task.id,
          )
        : undefined,
    [threads, task, board.id],
  );

  const comments = thread?.comments ?? [];
  const tree = useMemo(() => buildCommentTree(comments), [comments]);
  const count = comments.filter((comment) => !comment.deletedAt).length;

  const post = () => {
    const text = body.trim();
    if (!text || !task || !canComment) return;

    try {
      if (thread) {
        createComment({
          threadId: thread.id,
          body: textToCommentBody(text),
          ...(replyTo
            ? { metadata: { replyToCommentId: replyTo.commentId } }
            : {}),
        });
      } else {
        createThread({
          body: textToCommentBody(text),
          metadata: { boardId: board.id, taskId: task.id },
        });
      }
      setBody("");
      setReplyTo(null);
    } catch {
      toast.add({
        title: "Could not send the comment",
        description: "Check your connection and try again.",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full p-0 sm:max-w-md">
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="gap-2 border-b border-border/70 p-5 pr-12">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                <MessageSquare className="size-5" />
              </span>
              <div className="min-w-0">
                <SheetTitle>Task comments</SheetTitle>
                <SheetDescription className="mt-1">
                  {task ? task.title : "Choose a task to view its conversation."}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {task ? (
            <>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="flex flex-col gap-4">
                  <TaskDetail task={task} columnName={columnName} />

                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      <Sparkles className="size-3.5" />
                      Conversation
                    </h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {count}
                    </span>
                  </div>

                  {isLoading && !thread ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card p-6 text-xs text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading comments…
                    </div>
                  ) : error ? (
                    <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-[11px] text-destructive">
                      Comments could not load. Try reopening this task.
                    </p>
                  ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
                      <MessageSquare className="size-5 text-muted-foreground" />
                      <p className="text-xs font-medium">No comments yet</p>
                      <p className="max-w-[15rem] text-[10px] leading-relaxed text-muted-foreground">
                        Leave the first note so everyone can follow the thinking
                        behind this task.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {tree.map((node) => (
                        <CommentThreadItem
                          key={node.comment.id}
                          node={node}
                          viewer={viewer}
                          onReply={
                            canComment
                              ? (commentId, authorName) => {
                                  setReplyTo({ commentId, authorName });
                                  setBody("");
                                }
                              : undefined
                          }
                          replyToId={replyTo?.commentId ?? null}
                          replyComposer={
                            <CommentComposer
                              value={body}
                              onChange={setBody}
                              onSubmit={post}
                              replyToName={replyTo?.authorName}
                              onCancelReply={() => {
                                setReplyTo(null);
                                setBody("");
                              }}
                              autoFocus
                            />
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border/70 bg-card/60 p-4">
                {canComment ? (
                  replyTo ? (
                    <p className="rounded-lg bg-muted/50 p-2.5 text-center text-[11px] text-muted-foreground">
                      Replying to{" "}
                      <span className="font-medium text-foreground">
                        {replyTo.authorName}
                      </span>{" "}
                      under their comment. Press Cancel there to write a new
                      comment instead.
                    </p>
                  ) : (
                    <CommentComposer
                      value={body}
                      onChange={setBody}
                      onSubmit={post}
                    />
                  )
                ) : (
                  <p className="rounded-lg bg-muted/50 p-2.5 text-center text-[11px] text-muted-foreground">
                    You have view-only access, so you cannot comment on this
                    board.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
