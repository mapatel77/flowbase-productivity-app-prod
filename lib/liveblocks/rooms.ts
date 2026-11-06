export const BOARD_ROOM_PREFIX = "board";

/** One Liveblocks room per Kanban board keeps presence and threads isolated. */
export function getBoardRoomId(boardId: number): string {
  return `${BOARD_ROOM_PREFIX}:${boardId}`;
}

export type ParsedRoom =
  | { type: "board"; boardId: number }
  | { type: "unknown" };

/** Validates the room before issuing a Liveblocks token. */
export function parseRoomId(roomId: string): ParsedRoom {
  const match = /^board:(\d+)$/.exec(roomId);
  if (!match) return { type: "unknown" };

  const boardId = Number.parseInt(match[1]!, 10);
  if (!Number.isSafeInteger(boardId) || boardId <= 0) {
    return { type: "unknown" };
  }

  return { type: "board", boardId };
}
