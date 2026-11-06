import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { resolveCurrentUserProfile } from "@/lib/calendar/user";
import { getUserColor, getUserDisplayName } from "@/lib/liveblocks/user-color";

/**
 * Resolves the small user-info payload Liveblocks needs for presence and
 * comment authors. Only display data is exposed.
 */
export async function GET(request: Request) {
  const profile = await resolveCurrentUserProfile();
  if (!profile) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isSafeInteger(value) && value > 0);

  if (ids.length === 0) return Response.json([]);

  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, ids));

  const byId = new Map(rows.map((row) => [row.id, row]));

  return Response.json(
    ids.map((id) => {
      const user = byId.get(id);
      if (!user) {
        return {
          name: `User ${id}`,
          color: getUserColor(String(id)),
        };
      }

      return {
        name: getUserDisplayName(user.name, user.email),
        email: user.email,
        color: getUserColor(user.email),
      };
    }),
  );
}
