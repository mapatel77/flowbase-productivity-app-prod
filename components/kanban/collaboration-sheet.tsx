"use client";

import { useEffect, useState } from "react";
import {
  Info,
  Loader2,
  Mail,
  Share2,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

import { BoardPresence, type PresenceUser } from "@/components/kanban/board-presence";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { getBoardCollaborators, inviteBoardMember, removeBoardMember } from "@/app/tasks/actions";
import { categoryTones } from "@/lib/calendar/colors";
import type {
  KanbanBoard,
  KanbanCollaborator,
  KanbanViewer,
} from "@/lib/kanban/types";
import { getUserInitials } from "@/lib/liveblocks/user-color";
import { cn } from "@/lib/utils";

type CollaborationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: KanbanBoard;
  viewer: KanbanViewer;
  activeUsers: PresenceUser[];
  collaborationEnabled: boolean;
};

function roleLabel(role: KanbanCollaborator["role"]): string {
  if (role === "owner") return "Owner";
  if (role === "viewer") return "Viewer";
  return "Editor";
}

/**
 * Sharing lives in Postgres, while the avatar strip is backed by Liveblocks
 * presence. That means invites still work when realtime is not configured.
 */
export function CollaborationSheet({
  open,
  onOpenChange,
  board,
  viewer,
  activeUsers,
  collaborationEnabled,
}: CollaborationSheetProps) {
  const [collaborators, setCollaborators] = useState<KanbanCollaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const isOwner = board.accessRole === "owner";

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setEmail("");

    void getBoardCollaborators({ boardId: board.id })
      .then((result) => {
        if (cancelled) return;

        if (!result.ok) {
          setLoadError(result.error);
          return;
        }

        setCollaborators(result.data);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Could not load the people on this board.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, board.id, reloadToken]);

  const invite = async () => {
    const value = email.trim();
    if (!value || inviting || !isOwner) return;

    setInviting(true);
    try {
      const result = await inviteBoardMember({ boardId: board.id, email: value });

      if (!result.ok) {
        toast.add({ title: "Could not share the board", description: result.error });
        return;
      }

      setCollaborators((current) => [...current, result.data]);
      setEmail("");
      toast.add({
        title: result.data.status === "pending" ? "Invite saved" : "Board shared",
        description:
          result.data.status === "pending"
            ? `${result.data.email} can join as soon as they sign in with this email.`
            : `${result.data.name} now has editor access.`,
      });
    } finally {
      setInviting(false);
    }
  };

  const remove = async (member: KanbanCollaborator) => {
    if (!member.id || removingId !== null) return;

    const confirmed = window.confirm(
      `Remove ${member.name} from ${board.name}? They will lose access to this board.`,
    );
    if (!confirmed) return;

    setRemovingId(member.id);
    try {
      const result = await removeBoardMember({
        boardId: board.id,
        memberId: member.id,
      });

      if (!result.ok) {
        toast.add({ title: "Could not remove access", description: result.error });
        return;
      }

      setCollaborators((current) =>
        current.filter((item) => item.id !== member.id),
      );
      toast.add({
        title: "Access removed",
        description: `${member.name} can no longer open this board.`,
      });
    } finally {
      setRemovingId(null);
    }
  };

  const activeNames = activeUsers
    .map((user) => (user.isSelf ? `${user.name} (you)` : user.name))
    .join(", ");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full p-0 sm:max-w-md">
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="gap-2 border-b border-border/70 p-5 pr-12">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                <Users className="size-5" />
              </span>
              <div className="min-w-0">
                <SheetTitle>Board collaboration</SheetTitle>
                <SheetDescription className="mt-1">
                  Share <span className="font-medium text-foreground">{board.name}</span>{" "}
                  with your team and see who is here right now.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
            {!collaborationEnabled ? (
              <div className="flex gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>
                  Sharing still works, but live presence and task comments are
                  offline until <code>LIVEBLOCKS_SECRET_KEY</code> is configured.
                </p>
              </div>
            ) : null}

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Active now
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {activeUsers.length} online
                </span>
              </div>

              {activeUsers.length > 0 ? (
                <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/25 p-3">
                  <BoardPresence users={activeUsers} max={8} />
                  <p className="truncate text-[11px] text-muted-foreground">
                    {activeNames}
                  </p>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 text-[11px] text-muted-foreground">
                  No one is connected right now. Open this board in another
                  browser to see presence appear.
                </p>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <ShieldCheck className="size-3.5" />
                  People with access
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {collaborators.length || (loading ? "…" : 0)}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card p-6 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading people…
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-[11px] text-destructive">
                  <p>{loadError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReloadToken((token) => token + 1)}
                    className="h-7 rounded-lg bg-card/70"
                  >
                    Try again
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {collaborators.map((member) => {
                    const tone = categoryTones[member.color];
                    const isSelf = member.userId === viewer.id;

                    return (
                      <li
                        key={`${member.id ?? "owner"}-${member.email}`}
                        className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3"
                      >
                        <Avatar size="sm">
                          <AvatarFallback
                            className={cn("text-[10px] font-semibold", tone.chip)}
                          >
                            {getUserInitials(member.name, member.email)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <p className="truncate text-[13px] font-medium">
                              {member.name}
                              {isSelf ? " (you)" : ""}
                            </p>
                            {member.status === "pending" ? (
                              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                Pending
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {member.email}
                          </p>
                        </div>

                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold",
                            member.role === "owner"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                              : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
                          )}
                        >
                          {roleLabel(member.role)}
                        </span>

                        {isOwner && member.id !== null ? (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => void remove(member)}
                            disabled={removingId === member.id}
                            aria-label={`Remove ${member.name}`}
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            {removingId === member.id ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <UserMinus />
                            )}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {isOwner ? (
              <section className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                    <Share2 className="size-3.5" />
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold">Invite by email</h3>
                    <p className="text-[10px] text-muted-foreground">
                      New people get editor access to this board.
                    </p>
                  </div>
                </div>

                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void invite();
                  }}
                >
                  <div className="relative min-w-0 flex-1">
                    <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="teammate@example.com"
                      aria-label="Email address to invite"
                      className="h-9 rounded-xl bg-card pl-8"
                      disabled={inviting}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={inviting || !email.trim()}
                    className="h-9 gap-1.5 rounded-xl"
                  >
                    {inviting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <UserPlus />
                    )}
                    Invite
                  </Button>
                </form>

                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Invites are saved immediately. If they do not have an account
                  yet, access activates when they sign in with this email.
                </p>
              </section>
            ) : (
              <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 text-[11px] text-muted-foreground">
                Only the board owner can invite or remove people.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
