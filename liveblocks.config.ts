import type { ColorToken } from "@/lib/calendar/colors";

declare global {
  interface Liveblocks {
    /** Ephemeral data shown in the board's active-collaborator stack. */
    Presence: {
      name: string;
      email: string;
      color: ColorToken;
      activeTaskId: number | null;
    };

    /** Resolved user info for presence and comment authors. */
    UserMeta: {
      id: string;
      info: {
        name: string;
        email?: string;
        color?: string;
      };
    };

    /** Threads are scoped to a single card on a board. */
    ThreadMetadata: {
      boardId: number;
      taskId: number;
    };

    /** Remembers which comment a reply belongs to so it nests in the UI. */
    CommentMetadata: {
      replyToCommentId?: string;
    };
  }
}

export {};
