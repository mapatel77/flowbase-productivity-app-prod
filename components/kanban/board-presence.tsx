"use client";

import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { categoryTones, type ColorToken } from "@/lib/calendar/colors";
import { getUserInitials } from "@/lib/liveblocks/user-color";
import { cn } from "@/lib/utils";

export type PresenceUser = {
  id: string;
  name: string;
  email: string;
  color: ColorToken;
  activeTaskId: number | null;
  isSelf: boolean;
};

type BoardPresenceProps = {
  users: PresenceUser[];
  max?: number;
  className?: string;
};

/** A compact stack of colourful avatars with a live dot per person. */
export function BoardPresence({
  users,
  max = 4,
  className,
}: BoardPresenceProps) {
  if (users.length === 0) return null;

  const visible = users.slice(0, max);
  const extra = users.length - visible.length;

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      aria-label={`${users.length} active collaborator${
        users.length === 1 ? "" : "s"
      }`}
    >
      <div className="flex -space-x-2">
        {visible.map((user) => {
          const tone = categoryTones[user.color];

          return (
            <Avatar
              key={user.id}
              size="sm"
              title={`${user.name}${user.isSelf ? " (you)" : ""}`}
              className="ring-2 ring-background"
            >
              <AvatarFallback
                className={cn(
                  "text-[10px] font-semibold tracking-tight",
                  tone.chip,
                )}
              >
                {getUserInitials(user.name, user.email)}
              </AvatarFallback>
              <AvatarBadge
                className="bg-emerald-500 dark:bg-emerald-400"
                aria-hidden
              />
            </Avatar>
          );
        })}

        {extra > 0 ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-2 ring-background">
            +{extra}
          </span>
        ) : null}
      </div>

      <span className="hidden text-[10px] font-medium text-muted-foreground sm:inline">
        {users.length} active
      </span>
    </div>
  );
}
