import { getBoardAccess } from "@/lib/kanban/access";
import { getLiveblocksServer } from "@/lib/liveblocks/server";
import { getBoardRoomId, parseRoomId } from "@/lib/liveblocks/rooms";
import { getUserColor, getUserDisplayName } from "@/lib/liveblocks/user-color";
import { resolveCurrentUserProfile } from "@/lib/calendar/user";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    room?: unknown;
  } | null;

  const room = typeof body?.room === "string" ? body.room : null;
  const parsed = room ? parseRoomId(room) : { type: "unknown" as const };

  if (!room || parsed.type !== "board") {
    return Response.json({ error: "Unknown room." }, { status: 400 });
  }

  // The requested room must match its board ID exactly.
  if (room !== getBoardRoomId(parsed.boardId)) {
    return Response.json({ error: "Unknown room." }, { status: 400 });
  }

  const profile = await resolveCurrentUserProfile();
  if (!profile) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const access = await getBoardAccess(profile, parsed.boardId);
  if (!access) {
    return Response.json({ error: "No access to this board." }, { status: 403 });
  }

  const liveblocks = getLiveblocksServer();
  if (!liveblocks) {
    return Response.json(
      { error: "Liveblocks is not configured." },
      { status: 503 },
    );
  }

  const session = liveblocks.prepareSession(String(profile.id), {
    userInfo: {
      name: getUserDisplayName(profile.name, profile.email),
      email: profile.email,
      color: getUserColor(profile.email),
    },
  });

  session.allow(room, access.role === "viewer" ? ["*:read"] : ["*:write"]);

  const result = await session.authorize();

  return new Response(result.body, {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
}
