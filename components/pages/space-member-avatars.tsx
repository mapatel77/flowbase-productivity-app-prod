"use client";

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { categoryTones } from "@/lib/calendar/colors";
import { getUserInitials } from "@/lib/liveblocks/user-color";
import type { SpaceMember } from "@/lib/pages/types";
import { cn } from "@/lib/utils";

type SpaceMemberAvatarsProps = {
  members: SpaceMember[];
  /** How many avatars are shown before the “+N” counter takes over. */
  max?: number;
  className?: string;
};

/** The overlapping avatar strip shown on space cards and rows. */
export function SpaceMemberAvatars({
  members,
  max = 3,
  className,
}: SpaceMemberAvatarsProps) {
  const visible = members.slice(0, max);
  const extra = members.length - visible.length;

  return (
    <AvatarGroup className={cn("shrink-0", className)}>
      {visible.map((member) => (
        <Avatar
          key={member.email}
          size="sm"
          title={`${member.name} · ${member.role}`}
          className="ring-2 ring-card"
        >
          <AvatarFallback
            className={cn(
              "text-[9px] font-semibold",
              categoryTones[member.color].chip,
            )}
          >
            {getUserInitials(member.name, member.email)}
          </AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 ? (
        <AvatarGroupCount className="size-6 text-[9px] font-semibold">
          +{extra}
        </AvatarGroupCount>
      ) : null}
    </AvatarGroup>
  );
}
