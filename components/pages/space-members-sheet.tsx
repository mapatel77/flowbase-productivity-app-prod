"use client";

import {
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getSpaceMembers,
  inviteSpaceMember,
  removeSpaceMember,
} from "@/app/pages/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { categoryTones } from "@/lib/calendar/colors";
import { getUserInitials } from "@/lib/liveblocks/user-color";
import type { Space, SpaceMember } from "@/lib/pages/types";
import { cn } from "@/lib/utils";

type SpaceMembersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: Space | null;
  onChanged?: () => void;
};

function roleLabel(role: SpaceMember["role"]): string {
  if (role === "owner") return "Owner";
  if (role === "viewer") return "Viewer";
  return "Editor";
}

/** Lets the owner invite other people into a space. */
export function SpaceMembersSheet({
  open,
  onOpenChange,
  space,
  onChanged,
}: SpaceMembersSheetProps) {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const isOwner = space?.accessRole === "owner";

  useEffect(() => {
    if (!open || !space) return;

    let cancelled = false;
    setLoading(true);
    setEmail("");

    void getSpaceMembers(space.id)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          toast.add({
            title: "Could not load the people in this space",
            description: result.error,
            type: "error",
          });
          return;
        }
        setMembers(result.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, space]);

  const invite = async () => {
    const value = email.trim();
    if (!value || inviting || !space) return;

    setInviting(true);
    try {
      const result = await inviteSpaceMember({ spaceId: space.id, email: value });

      if (!result.ok) {
        toast.add({
          title: "Could not share the space",
          description: result.error,
          type: "error",
        });
        return;
      }

      setMembers((current) => [...current, result.data]);
      setEmail("");
      onChanged?.();
      toast.add({
        title: result.data.status === "pending" ? "Invite saved" : "Space shared",
        description:
          result.data.status === "pending"
            ? `${result.data.email} can join as soon as they sign in with this email.`
            : `${result.data.name} now has editor access.`,
      });
    } finally {
      setInviting(false);
    }
  };

  const remove = async (member: SpaceMember) => {
    if (!space || member.id === null || removingId !== null) return;

    const confirmed = window.confirm(
      `Remove ${member.name} from ${space.name}? They will lose access to this space.`,
    );
    if (!confirmed) return;

    setRemovingId(member.id);
    try {
      const result = await removeSpaceMember({
        spaceId: space.id,
        memberId: member.id,
      });

      if (!result.ok) {
        toast.add({
          title: "Could not remove that person",
          description: result.error,
          type: "error",
        });
        return;
      }

      setMembers((current) => current.filter((item) => item.id !== member.id));
      onChanged?.();
      toast.add({ title: "Member removed", description: member.name });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle>Invite collaborators</SheetTitle>
          <SheetDescription>
            {space
              ? `People with access to ${space.name}. Invites are matched by email.`
              : "Share this space with your team."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="space-invite-email"
              className="text-sm font-medium"
            >
              Invite by email
            </label>
            <div className="flex gap-2">
              <Input
                id="space-invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void invite();
                  }
                }}
                placeholder="teammate@company.com"
                disabled={!isOwner}
                className="h-9 rounded-xl"
              />
              <Button
                onClick={() => void invite()}
                disabled={inviting || !email.trim() || !isOwner}
                className="h-9 shrink-0 gap-1.5 rounded-xl"
              >
                <UserPlus className="size-4" />
                Invite
              </Button>
            </div>
            {!isOwner ? (
              <p className="text-[11px] text-muted-foreground">
                Only the owner can invite people to this space.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              People ({members.length})
            </p>

            {loading ? (
              <p className="text-[12px] text-muted-foreground">Loading people…</p>
            ) : members.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                Nobody else has access to this space yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {members.map((member) => (
                  <li
                    key={member.email}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2"
                  >
                    <Avatar size="sm">
                      <AvatarFallback
                        className={cn(
                          "text-[9px] font-semibold",
                          categoryTones[member.color].chip,
                        )}
                      >
                        {getUserInitials(member.name, member.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {member.name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {member.email}
                      </p>
                    </div>

                    <Badge
                      variant="secondary"
                      className="shrink-0 rounded-full text-[10px]"
                    >
                      {roleLabel(member.role)}
                    </Badge>

                    {member.status === "pending" ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 rounded-full text-[10px] text-muted-foreground"
                      >
                        Pending
                      </Badge>
                    ) : null}

                    {isOwner && member.id !== null ? (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${member.name}`}
                        disabled={removingId === member.id}
                        onClick={() => void remove(member)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <UserMinus className="size-3.5" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
