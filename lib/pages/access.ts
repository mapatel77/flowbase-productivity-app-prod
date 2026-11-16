import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { spaceMembers, spaces } from "@/db/schema";
import type { CurrentUserProfile } from "@/lib/calendar/user";
import type { SpaceRole } from "@/lib/pages/types";

type SpaceRow = typeof spaces.$inferSelect;

export type SpaceAccess = {
  space: SpaceRow;
  role: SpaceRole;
};

/** Members are editors today; the schema leaves room for read-only viewers. */
function normalizeMemberRole(role: string | null | undefined): SpaceRole {
  return role === "viewer" ? "viewer" : "editor";
}

/** Owners and editors can change space and page content. */
export function canEditSpace(role: SpaceRole): boolean {
  return role === "owner" || role === "editor";
}

/** Only the owner can rename, delete, archive or share a space. */
export function isSpaceOwner(role: SpaceRole): boolean {
  return role === "owner";
}

/**
 * Claims pending email invites now that this person has an account. Access
 * already works by email, but this lets the member list show them as active
 * instead of forever pending.
 */
export async function activatePendingSpaceInvites(
  viewer: CurrentUserProfile,
): Promise<void> {
  const email = viewer.email.trim().toLowerCase();
  if (!email) return;

  await db
    .update(spaceMembers)
    .set({ userId: viewer.id })
    .where(
      and(
        isNull(spaceMembers.userId),
        eq(spaceMembers.email, email),
      ),
    );
}

/** Resolves one space with the viewer's access level, or `null` if hidden. */
export async function getSpaceAccess(
  viewer: CurrentUserProfile,
  spaceId: number,
): Promise<SpaceAccess | null> {
  const [space] = await db
    .select()
    .from(spaces)
    .where(eq(spaces.id, spaceId))
    .limit(1);

  if (!space) return null;

  if (space.userId === viewer.id) {
    return { space, role: "owner" };
  }

  const email = viewer.email.trim().toLowerCase();
  const [member] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(
        eq(spaceMembers.spaceId, spaceId),
        or(
          eq(spaceMembers.userId, viewer.id),
          eq(spaceMembers.email, email),
        ),
      ),
    )
    .limit(1);

  if (!member) return null;

  return { space, role: normalizeMemberRole(member.role) };
}

/**
 * Returns every space the viewer can see and the role they hold. Owned spaces
 * always win over an accidental member row.
 */
export async function getAccessibleSpaceRoles(
  viewer: CurrentUserProfile,
): Promise<Map<number, SpaceRole>> {
  await activatePendingSpaceInvites(viewer);
  const email = viewer.email.trim().toLowerCase();

  const [ownedSpaces, memberships] = await Promise.all([
    db
      .select({ id: spaces.id })
      .from(spaces)
      .where(eq(spaces.userId, viewer.id)),
    db
      .select({
        spaceId: spaceMembers.spaceId,
        role: spaceMembers.role,
      })
      .from(spaceMembers)
      .where(
        or(
          eq(spaceMembers.userId, viewer.id),
          eq(spaceMembers.email, email),
        ),
      ),
  ]);

  const roles = new Map<number, SpaceRole>();

  for (const space of ownedSpaces) {
    roles.set(space.id, "owner");
  }

  for (const membership of memberships) {
    if (roles.has(membership.spaceId)) continue;
    roles.set(membership.spaceId, normalizeMemberRole(membership.role));
  }

  return roles;
}
