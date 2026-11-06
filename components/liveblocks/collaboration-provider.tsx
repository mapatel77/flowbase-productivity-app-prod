"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { createContext, useContext, type ReactNode } from "react";

const CollaborationEnabledContext = createContext(false);

type CollaborationProviderProps = {
  enabled: boolean;
  children: ReactNode;
};

/**
 * Mounts Liveblocks once for the whole app. Pages only join a room when they
 * have collaboration enabled, so Notes, Whiteboard, Calendar and Pages can
 * reuse the same provider later.
 */
export function CollaborationProvider({
  enabled,
  children,
}: CollaborationProviderProps) {
  return (
    <CollaborationEnabledContext.Provider value={enabled}>
      {enabled ? (
        <LiveblocksProvider
          authEndpoint="/api/liveblocks-auth"
          resolveUsers={resolveUsers}
          badgeLocation="bottom-left"
          throttle={80}
        >
          {children}
        </LiveblocksProvider>
      ) : (
        children
      )}
    </CollaborationEnabledContext.Provider>
  );
}

export function useCollaborationEnabled(): boolean {
  return useContext(CollaborationEnabledContext);
}

type ResolvedUser = {
  name: string;
  email: string;
  color: string;
};

async function resolveUsers({
  userIds,
}: {
  userIds: string[];
}): Promise<Array<ResolvedUser | undefined> | undefined> {
  try {
    const response = await fetch(
      `/api/liveblocks/users?ids=${encodeURIComponent(userIds.join(","))}`,
    );

    if (!response.ok) return undefined;

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) return undefined;

    return data.map((item) => {
      if (!item || typeof item !== "object") return undefined;

      const record = item as {
        name?: unknown;
        email?: unknown;
        color?: unknown;
      };

      if (typeof record.name !== "string") return undefined;

      return {
        name: record.name,
        email: typeof record.email === "string" ? record.email : "",
        color: typeof record.color === "string" ? record.color : "sky",
      };
    });
  } catch {
    return undefined;
  }
}
