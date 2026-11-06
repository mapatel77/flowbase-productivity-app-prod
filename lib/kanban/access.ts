import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { kanbanBoardMembers, kanbanBoards } from "@/db/schema";
import type { CurrentUserProfile } from "@/lib/calendar/user";
import type { KanbanBoardRole } from "@/lib/kanban/types";

type BoardRow = typeof kanbanBoards.$inferSelect;

export type BoardAccess = {
  board: BoardRow;
  role: KanbanBoardRole;
};

/** Members are editors today; the schema leaves room for read-only viewers. */
function normalizeMemberRole(role: string | null | undefined): KanbanBoardRole {
  return role === "viewer" ? "viewer" : "editor";
}

/** Owners and editors can change board content. */
export function canEditBoard(role: KanbanBoardRole): boolean {
  return role === "owner" || role === "editor";
}

/** Only the owner can rename, delete or share a board. */
export function isBoardOwner(role: KanbanBoardRole): boolean {
  return role === "owner";
}

/**
 * Claims pending email invites now that this person has an account. Access
 * already works by email, but this lets the collaboration panel show them as
 * active instead of forever pending.
 */
export async function activatePendingBoardInvites(
  viewer: CurrentUserProfile,
): Promise<void> {
  const email = viewer.email.trim().toLowerCase();
  if (!email) return;

  await db
    .update(kanbanBoardMembers)
    .set({ userId: viewer.id })
    .where(
      and(
        isNull(kanbanBoardMembers.userId),
        eq(kanbanBoardMembers.email, email),
      ),
    );
}

/** Resolves one board with the viewer's access level, or `null` if hidden. */
export async function getBoardAccess(
  viewer: CurrentUserProfile,
  boardId: number,
): Promise<BoardAccess | null> {
  const [board] = await db
    .select()
    .from(kanbanBoards)
    .where(eq(kanbanBoards.id, boardId))
    .limit(1);

  if (!board) return null;

  if (board.userId === viewer.id) {
    return { board, role: "owner" };
  }

  const email = viewer.email.trim().toLowerCase();
  const [member] = await db
    .select({ role: kanbanBoardMembers.role })
    .from(kanbanBoardMembers)
    .where(
      and(
        eq(kanbanBoardMembers.boardId, boardId),
        or(
          eq(kanbanBoardMembers.userId, viewer.id),
          eq(kanbanBoardMembers.email, email),
        ),
      ),
    )
    .limit(1);

  if (!member) return null;

  return { board, role: normalizeMemberRole(member.role) };
}

/**
 * Returns every board the viewer can see and the role they hold. Owned boards
 * always win over an accidental member row.
 */
export async function getAccessibleBoardRoles(
  viewer: CurrentUserProfile,
): Promise<Map<number, KanbanBoardRole>> {
  await activatePendingBoardInvites(viewer);
  const email = viewer.email.trim().toLowerCase();

  const [ownedBoards, memberships] = await Promise.all([
    db
      .select({ id: kanbanBoards.id })
      .from(kanbanBoards)
      .where(eq(kanbanBoards.userId, viewer.id)),
    db
      .select({
        boardId: kanbanBoardMembers.boardId,
        role: kanbanBoardMembers.role,
      })
      .from(kanbanBoardMembers)
      .where(
        or(
          eq(kanbanBoardMembers.userId, viewer.id),
          eq(kanbanBoardMembers.email, email),
        ),
      ),
  ]);

  const roles = new Map<number, KanbanBoardRole>();

  for (const board of ownedBoards) {
    roles.set(board.id, "owner");
  }

  for (const membership of memberships) {
    if (roles.has(membership.boardId)) continue;
    roles.set(membership.boardId, normalizeMemberRole(membership.role));
  }

  return roles;
}
