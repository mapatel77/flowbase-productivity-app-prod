import { Liveblocks } from "@liveblocks/node";

import { getBoardRoomId } from "@/lib/liveblocks/rooms";

let client: Liveblocks | null = null;

/**
 * Returns a server client only when Liveblocks is configured. Collaboration UI
 * stays visible without it, but realtime presence/comments fail gracefully.
 */
export function getLiveblocksServer(): Liveblocks | null {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) return null;

  client ??= new Liveblocks({ secret });
  return client;
}

/** Best-effort cleanup so deleted boards do not leave orphaned rooms. */
export async function deleteBoardRoom(boardId: number): Promise<void> {
  const liveblocks = getLiveblocksServer();
  if (!liveblocks) return;

  try {
    await liveblocks.deleteRoom(getBoardRoomId(boardId));
  } catch (error) {
    console.error("Failed to delete a Liveblocks board room", error);
  }
}

/** Best-effort cleanup when a task with comments is deleted. */
export async function deleteTaskThreads(
  boardId: number,
  taskId: number,
): Promise<void> {
  const liveblocks = getLiveblocksServer();
  if (!liveblocks) return;

  const roomId = getBoardRoomId(boardId);

  try {
    const { data } = await liveblocks.getThreads({
      roomId,
      query: { metadata: { boardId, taskId } },
    });

    await Promise.all(
      data.map((thread) =>
        liveblocks.deleteThread({ roomId, threadId: thread.id }),
      ),
    );
  } catch (error) {
    console.error("Failed to delete Liveblocks task threads", error);
  }
}
