import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  calendarCategories,
  calendarEntries,
  kanbanBoardMembers,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
  notes,
  pages,
  spaceMembers,
  spaces,
  templateApps,
  whiteboards,
} from "@/db/schema";
import { resolveCurrentUserProfile } from "@/lib/calendar/user";
import { getUserSettings } from "@/lib/settings/queries";

/** Downloads everything the signed-in person owns as a single JSON file. */
export async function GET() {
  const profile = await resolveCurrentUserProfile();

  if (!profile) {
    return NextResponse.json(
      { error: "No signed-in workspace user could be found." },
      { status: 401 },
    );
  }

  const userId = profile.id;
  const email = profile.email.toLowerCase();

  const [
    settings,
    categories,
    noteRows,
    calendarRows,
    boardRows,
    columnRows,
    taskRows,
    spaceRows,
    pageRows,
    whiteboardRows,
    templateRows,
    boardMemberRows,
    spaceMemberRows,
  ] = await Promise.all([
    getUserSettings(userId),
    db
      .select()
      .from(calendarCategories)
      .where(eq(calendarCategories.userId, userId)),
    db.select().from(notes).where(eq(notes.userId, userId)),
    db
      .select()
      .from(calendarEntries)
      .where(eq(calendarEntries.userId, userId)),
    db.select().from(kanbanBoards).where(eq(kanbanBoards.userId, userId)),
    db.select().from(kanbanColumns).where(eq(kanbanColumns.userId, userId)),
    db.select().from(kanbanTasks).where(eq(kanbanTasks.userId, userId)),
    db.select().from(spaces).where(eq(spaces.userId, userId)),
    db.select().from(pages).where(eq(pages.userId, userId)),
    db.select().from(whiteboards).where(eq(whiteboards.userId, userId)),
    db.select().from(templateApps).where(eq(templateApps.userId, userId)),
    db
      .select()
      .from(kanbanBoardMembers)
      .where(
        or(
          eq(kanbanBoardMembers.userId, userId),
          eq(kanbanBoardMembers.email, email),
        ),
      ),
    db
      .select()
      .from(spaceMembers)
      .where(or(eq(spaceMembers.userId, userId), eq(spaceMembers.email, email))),
  ]);

  const payload = {
    app: "Flowbase",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: {
      name: profile.name,
      email: profile.email,
      clerkId: profile.clerkId,
    },
    settings,
    categories,
    notes: noteRows,
    calendar: calendarRows,
    kanban: {
      boards: boardRows,
      columns: columnRows,
      tasks: taskRows,
      memberships: boardMemberRows,
    },
    spaces: {
      items: spaceRows,
      pages: pageRows,
      memberships: spaceMemberRows,
    },
    whiteboards: whiteboardRows,
    templateApps: templateRows,
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const body = JSON.stringify(payload, null, 2);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="flowbase-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
