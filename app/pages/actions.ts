"use server";

import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { pages, spaceMembers, spaces, users } from "@/db/schema";
import { isColorToken, type ColorToken } from "@/lib/calendar/colors";
import {
  resolveCurrentUserProfile,
  type CurrentUserProfile,
} from "@/lib/calendar/user";
import { getUserColor, getUserDisplayName } from "@/lib/liveblocks/user-color";
import {
  canEditSpace,
  getAccessibleSpaceRoles,
  getSpaceAccess,
  isSpaceOwner,
} from "@/lib/pages/access";
import {
  MAX_PAGE_TITLES_PER_SPACE,
  PAGE_DESCRIPTION_MAX_LENGTH,
  PAGE_SELECTION_MAX_LENGTH,
  PAGE_TITLE_MAX_LENGTH,
  SPACE_DESCRIPTION_MAX_LENGTH,
  SPACE_NAME_MAX_LENGTH,
} from "@/lib/pages/constants";
import {
  extractPageText,
  isPageDocument,
  normalizePageContent,
  normalizePageTitle,
  pageTitle,
} from "@/lib/pages/content";
import { getTemplateOption, isPageTemplate } from "@/lib/pages/templates";
import { AiRefineError, refineTextWithGemini } from "@/lib/notes/ai";
import {
  REFINE_MODES,
  REFINE_TONES,
  type RefineMode,
  type RefineTone,
} from "@/lib/notes/types";
import type {
  ActionResult,
  PageDetail,
  PageSaveResult,
  Space,
  SpaceDetail,
  SpaceMember,
  SpacePage,
  SpaceRole,
  SpacesData,
  SpaceViewer,
} from "@/lib/pages/types";

const MAX_CONTENT_BYTES = 2_000_000;

/* ── helpers ────────────────────────────────────────────────────────────── */

function fail(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error ? error.message : "Something went wrong. Try again.";
  console.error("Pages action failed", error);
  return { ok: false, error: message };
}

async function requireProfile() {
  const profile = await resolveCurrentUserProfile();
  if (!profile) throw new Error("No workspace user could be found.");
  return profile;
}

function toViewer(profile: CurrentUserProfile): SpaceViewer {
  return {
    id: profile.id,
    name: getUserDisplayName(profile.name, profile.email),
    email: profile.email,
    color: getUserColor(profile.email),
  };
}

function normalizeSpaceName(value: string): string {
  return value.trim().slice(0, SPACE_NAME_MAX_LENGTH);
}

function normalizeSpaceDescription(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, SPACE_DESCRIPTION_MAX_LENGTH);
}

function normalizePageDescription(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, PAGE_DESCRIPTION_MAX_LENGTH);
}

function normalizeColor(value: unknown): ColorToken {
  return isColorToken(value) ? value : "violet";
}

/** Every write invalidates the whole module, including the nested routes. */
function revalidatePages() {
  revalidatePath("/pages", "layout");
}

type PageStats = {
  pageCount: number;
  favoritePageCount: number;
  pageTitles: string[];
};

/** Counts and page titles for one space. */
function collectPageStats(
  rows: Array<{
    id: number;
    spaceId: number;
    title: string;
    favorite: boolean;
    archived: boolean;
  }>,
  spaceId: number,
): PageStats {
  const own = rows.filter((row) => row.spaceId === spaceId);
  const active = own.filter((row) => !row.archived);

  return {
    pageCount: active.length,
    favoritePageCount: active.filter((row) => row.favorite).length,
    pageTitles: active
      .slice(0, MAX_PAGE_TITLES_PER_SPACE)
      .map((row) => row.title),
  };
}

function toSpaceMember(params: {
  id: number | null;
  userId: number | null;
  name: string | null;
  email: string;
  role: SpaceRole;
  status: "active" | "pending";
}): SpaceMember {
  return {
    id: params.id,
    userId: params.userId,
    name: getUserDisplayName(params.name, params.email),
    email: params.email,
    role: params.role,
    status: params.status,
    color: getUserColor(params.email),
  };
}

/* ── reads ──────────────────────────────────────────────────────────────── */

/**
 * Loads every space the viewer can reach — the ones they own plus the ones
 * shared with them — together with page counts and member avatars.
 */
export async function getSpacesData(): Promise<ActionResult<SpacesData>> {
  try {
    const profile = await requireProfile();
    const viewer = toViewer(profile);
    const roles = await getAccessibleSpaceRoles(profile);
    const spaceIds = [...roles.keys()];

    if (spaceIds.length === 0) {
      return { ok: true, data: { viewer, spaces: [] } };
    }

    const [spaceRows, pageRows, memberRows] = await Promise.all([
      db
        .select()
        .from(spaces)
        .where(inArray(spaces.id, spaceIds))
        .orderBy(desc(spaces.updatedAt), asc(spaces.name)),
      db
        .select({
          id: pages.id,
          spaceId: pages.spaceId,
          title: pages.title,
          favorite: pages.favorite,
          archived: pages.archived,
        })
        .from(pages)
        .where(inArray(pages.spaceId, spaceIds)),
      db
        .select({
          id: spaceMembers.id,
          spaceId: spaceMembers.spaceId,
          userId: spaceMembers.userId,
          email: spaceMembers.email,
          role: spaceMembers.role,
          memberName: users.name,
        })
        .from(spaceMembers)
        .leftJoin(users, eq(spaceMembers.userId, users.id))
        .where(inArray(spaceMembers.spaceId, spaceIds)),
    ]);

    const ownerIds = [...new Set(spaceRows.map((row) => row.userId))];
    const ownerRows = ownerIds.length
      ? await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(inArray(users.id, ownerIds))
      : [];
    const owners = new Map(ownerRows.map((row) => [row.id, row]));

    const result: Space[] = spaceRows.map((row) => {
      const owner = owners.get(row.userId);
      const role = roles.get(row.id) ?? "owner";

      const members: SpaceMember[] = [];

      if (owner) {
        members.push(
          toSpaceMember({
            id: null,
            userId: owner.id,
            name: owner.name,
            email: owner.email,
            role: "owner",
            status: "active",
          }),
        );
      }

      for (const member of memberRows) {
        if (member.spaceId !== row.id) continue;
        if (owner && member.email.toLowerCase() === owner.email.toLowerCase()) {
          continue;
        }

        members.push(
          toSpaceMember({
            id: member.id,
            userId: member.userId,
            name: member.memberName,
            email: member.email,
            role: member.role === "viewer" ? "viewer" : "editor",
            status: member.userId ? "active" : "pending",
          }),
        );
      }

      return {
        id: row.id,
        userId: row.userId,
        name: row.name,
        description: row.description,
        color: normalizeColor(row.color),
        favorite: row.favorite,
        archived: row.archived,
        lastOpenedAt: row.lastOpenedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        accessRole: role,
        ...collectPageStats(pageRows, row.id),
        members,
      };
    });

    return { ok: true, data: { viewer, spaces: result } };
  } catch (error) {
    return fail(error);
  }
}

/** Loads one space with its pages. */
export async function getSpaceData(
  spaceId: number,
): Promise<ActionResult<SpaceDetail>> {
  try {
    const profile = await requireProfile();
    const access = await getSpaceAccess(profile, spaceId);

    if (!access) {
      return { ok: false, error: "That space is not available." };
    }

    const [spaceRows, pageRows, memberRows] = await Promise.all([
      db.select().from(spaces).where(eq(spaces.id, spaceId)).limit(1),
      db
        .select()
        .from(pages)
        .where(eq(pages.spaceId, spaceId))
        .orderBy(desc(pages.updatedAt), asc(pages.title)),
      db
        .select({
          id: spaceMembers.id,
          userId: spaceMembers.userId,
          email: spaceMembers.email,
          role: spaceMembers.role,
          memberName: users.name,
        })
        .from(spaceMembers)
        .leftJoin(users, eq(spaceMembers.userId, users.id))
        .where(eq(spaceMembers.spaceId, spaceId)),
    ]);

    const row = spaceRows[0];
    if (!row) return { ok: false, error: "That space is not available." };

    const [owner] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);

    const members: SpaceMember[] = owner
      ? [
          toSpaceMember({
            id: null,
            userId: owner.id,
            name: owner.name,
            email: owner.email,
            role: "owner",
            status: "active",
          }),
        ]
      : [];

    for (const member of memberRows) {
      if (owner && member.email.toLowerCase() === owner.email.toLowerCase()) {
        continue;
      }

      members.push(
        toSpaceMember({
          id: member.id,
          userId: member.userId,
          name: member.memberName,
          email: member.email,
          role: member.role === "viewer" ? "viewer" : "editor",
          status: member.userId ? "active" : "pending",
        }),
      );
    }

    const editorIds = [
      ...new Set(
        pageRows
          .map((page) => page.lastEditedById ?? page.userId)
          .filter((id): id is number => typeof id === "number"),
      ),
    ];
    const editorRows = editorIds.length
      ? await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(inArray(users.id, editorIds))
      : [];
    const editors = new Map(editorRows.map((editor) => [editor.id, editor]));

    const pageList: SpacePage[] = pageRows.map((page) => {
      const editorId = page.lastEditedById ?? page.userId;
      const editor = editors.get(editorId);

      return {
        id: page.id,
        spaceId: page.spaceId,
        userId: page.userId,
        title: page.title,
        template: isPageTemplate(page.template) ? page.template : "blank",
        description: page.description,
        content: normalizePageContent(page.content),
        plainText: page.plainText,
        favorite: page.favorite,
        archived: page.archived,
        commentsCount: page.commentsCount,
        linkedTasksCount: page.linkedTasksCount,
        lastEditedById: page.lastEditedById,
        lastEditedByName: editor
          ? getUserDisplayName(editor.name, editor.email)
          : null,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      };
    });

    const space: Space = {
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      color: normalizeColor(row.color),
      favorite: row.favorite,
      archived: row.archived,
      lastOpenedAt: row.lastOpenedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      accessRole: access.role,
      ...collectPageStats(
        pageRows.map((page) => ({
          id: page.id,
          spaceId: page.spaceId,
          title: page.title,
          favorite: page.favorite,
          archived: page.archived,
        })),
        row.id,
      ),
      members,
    };

    return {
      ok: true,
      data: { viewer: toViewer(profile), space, pages: pageList },
    };
  } catch (error) {
    return fail(error);
  }
}

/** Loads a single page together with the space that owns it. */
export async function getPageData(
  spaceId: number,
  pageId: number,
): Promise<ActionResult<PageDetail>> {
  try {
    const profile = await requireProfile();
    const access = await getSpaceAccess(profile, spaceId);

    if (!access) {
      return { ok: false, error: "That page is not available." };
    }

    const pageRows = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.spaceId, spaceId)))
      .limit(1);

    const row = pageRows[0];
    if (!row) return { ok: false, error: "That page is not available." };

    const spaceResult = await getSpaceData(spaceId);
    if (!spaceResult.ok) return spaceResult;

    const editorId = row.lastEditedById ?? row.userId;
    const editorRows = editorId
      ? await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, editorId))
          .limit(1)
      : [];
    const editor = editorRows[0] ?? null;

    const page: SpacePage = {
      id: row.id,
      spaceId: row.spaceId,
      userId: row.userId,
      title: row.title,
      template: isPageTemplate(row.template) ? row.template : "blank",
      description: row.description,
      content: normalizePageContent(row.content),
      plainText: row.plainText,
      favorite: row.favorite,
      archived: row.archived,
      commentsCount: row.commentsCount,
      linkedTasksCount: row.linkedTasksCount,
      lastEditedById: row.lastEditedById,
      lastEditedByName: editor
        ? getUserDisplayName(editor.name, editor.email)
        : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    return {
      ok: true,
      data: {
        viewer: toViewer(profile),
        space: spaceResult.data.space,
        page,
      },
    };
  } catch (error) {
    return fail(error);
  }
}

/** The people attached to a space, including the owner. */
export async function getSpaceMembers(
  spaceId: number,
): Promise<ActionResult<SpaceMember[]>> {
  try {
    const profile = await requireProfile();
    const access = await getSpaceAccess(profile, spaceId);

    if (!access) return { ok: false, error: "That space is not available." };

    const [owner] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, access.space.userId))
      .limit(1);

    const memberRows = await db
      .select({
        id: spaceMembers.id,
        userId: spaceMembers.userId,
        email: spaceMembers.email,
        role: spaceMembers.role,
        memberName: users.name,
      })
      .from(spaceMembers)
      .leftJoin(users, eq(spaceMembers.userId, users.id))
      .where(eq(spaceMembers.spaceId, spaceId));

    const members: SpaceMember[] = owner
      ? [
          toSpaceMember({
            id: null,
            userId: owner.id,
            name: owner.name,
            email: owner.email,
            role: "owner",
            status: "active",
          }),
        ]
      : [];

    for (const member of memberRows) {
      if (owner && member.email.toLowerCase() === owner.email.toLowerCase()) {
        continue;
      }

      members.push(
        toSpaceMember({
          id: member.id,
          userId: member.userId,
          name: member.memberName,
          email: member.email,
          role: member.role === "viewer" ? "viewer" : "editor",
          status: member.userId ? "active" : "pending",
        }),
      );
    }

    return { ok: true, data: members };
  } catch (error) {
    return fail(error);
  }
}

/* ── space mutations ────────────────────────────────────────────────────── */

export async function createSpace(input: {
  name: string;
  description?: string | null;
  color?: string;
}): Promise<ActionResult<Space>> {
  try {
    const profile = await requireProfile();
    const name = normalizeSpaceName(input.name);

    if (!name) return { ok: false, error: "Give the space a name." };

    const [row] = await db
      .insert(spaces)
      .values({
        userId: profile.id,
        name,
        description: normalizeSpaceDescription(input.description),
        color: normalizeColor(input.color),
      })
      .returning();

    if (!row) return { ok: false, error: "The space could not be created." };

    revalidatePages();

    return {
      ok: true,
      data: {
        id: row.id,
        userId: row.userId,
        name: row.name,
        description: row.description,
        color: normalizeColor(row.color),
        favorite: row.favorite,
        archived: row.archived,
        lastOpenedAt: row.lastOpenedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        accessRole: "owner",
        pageCount: 0,
        favoritePageCount: 0,
        pageTitles: [],
        members: [
          toSpaceMember({
            id: null,
            userId: profile.id,
            name: profile.name,
            email: profile.email,
            role: "owner",
            status: "active",
          }),
        ],
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function updateSpace(input: {
  id: number;
  name?: string;
  description?: string | null;
  color?: string;
}): Promise<ActionResult<Space>> {
  try {
    const profile = await requireProfile();
    const access = await getSpaceAccess(profile, input.id);

    if (!access) return { ok: false, error: "That space is not available." };
    if (!isSpaceOwner(access.role)) {
      return { ok: false, error: "Only the owner can change this space." };
    }

    const patch: Partial<typeof spaces.$inferInsert> = { updatedAt: new Date() };

    if (input.name !== undefined) {
      const name = normalizeSpaceName(input.name);
      if (!name) return { ok: false, error: "Give the space a name." };
      patch.name = name;
    }

    if (input.description !== undefined) {
      patch.description = normalizeSpaceDescription(input.description);
    }

    if (input.color !== undefined) {
      patch.color = normalizeColor(input.color);
    }

    const [row] = await db
      .update(spaces)
      .set(patch)
      .where(eq(spaces.id, input.id))
      .returning();

    if (!row) return { ok: false, error: "That space is not available." };

    revalidatePages();

    const members = await getSpaceMembers(input.id);
    const pageRows = await db
      .select({
        id: pages.id,
        spaceId: pages.spaceId,
        title: pages.title,
        favorite: pages.favorite,
        archived: pages.archived,
      })
      .from(pages)
      .where(eq(pages.spaceId, input.id));

    return {
      ok: true,
      data: {
        id: row.id,
        userId: row.userId,
        name: row.name,
        description: row.description,
        color: normalizeColor(row.color),
        favorite: row.favorite,
        archived: row.archived,
        lastOpenedAt: row.lastOpenedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        accessRole: access.role,
        ...collectPageStats(pageRows, row.id),
        members: members.ok ? members.data : [],
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function toggleSpaceFavorite(
  id: number,
): Promise<ActionResult<Space>> {
  try {
    const profile = await requireProfile();
    const access = await getSpaceAccess(profile, id);

    if (!access) return { ok: false, error: "That space is not available." };
    if (!canEditSpace(access.role)) {
      return { ok: false, error: "You cannot change this space." };
    }

    const [row] = await db
      .update(spaces)
      .set({ favorite: !access.space.favorite, updatedAt: new Date() })
      .where(eq(spaces.id, id))
      .returning();

    if (!row) return { ok: false, error: "That space is not available." };

    revalidatePages();

    const pageRows = await db
      .select({
        id: pages.id,
        spaceId: pages.spaceId,
        title: pages.title,
        favorite: pages.favorite,
        archived: pages.archived,
      })
      .from(pages)
      .where(eq(pages.spaceId, id));
    const members = await getSpaceMembers(id);

    return {
      ok: true,
      data: {
        id: row.id,
        userId: row.userId,
        name: row.name,
        description: row.description,
        color: normalizeColor(row.color),
        favorite: row.favorite,
        archived: row.archived,
        lastOpenedAt: row.lastOpenedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        accessRole: access.role,
        ...collectPageStats(pageRows, row.id),
        members: members.ok ? members.data : [],
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function setSpaceArchived(
  id: number,
  archived: boolean,
): Promise<ActionResult<{ id: number; archived: boolean }>> {
  try {
    const profile = await requireProfile();
    const access = await getSpaceAccess(profile, id);

    if (!access) return { ok: false, error: "That space is not available." };
    if (!isSpaceOwner(access.role)) {
      return { ok: false, error: "Only the owner can archive this space." };
    }

    const [row] = await db
      .update(spaces)
      .set({ archived, updatedAt: new Date() })
      .where(eq(spaces.id, id))
      .returning({ id: spaces.id, archived: spaces.archived });

    if (!row) return { ok: false, error: "That space is not available." };

    revalidatePages();
    return { ok: true, data: row };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteSpace(id: number): Promise<ActionResult<{ id: number }>> {
  try {
    const profile = await requireProfile();
    const access = await getSpaceAccess(profile, id);

    if (!access) return { ok: false, error: "That space is not available." };
    if (!isSpaceOwner(access.role)) {
      return { ok: false, error: "Only the owner can delete this space." };
    }

    const [row] = await db
      .delete(spaces)
      .where(eq(spaces.id, id))
      .returning({ id: spaces.id });

    if (!row) return { ok: false, error: "That space is not available." };

    revalidatePages();
    return { ok: true, data: row };
  } catch (error) {
    return fail(error);
  }
}

/** Copies a space together with all of its pages. */
export async function duplicateSpace(id: number): Promise<ActionResult<Space>> {
  try {
    const profile = await requireProfile();
    const access = await getSpaceAccess(profile, id);

    if (!access) return { ok: false, error: "That space is not available." };
    if (!canEditSpace(access.role)) {
      return { ok: false, error: "You cannot duplicate this space." };
    }

    const original = access.space;
    const [row] = await db
      .insert(spaces)
      .values({
        userId: profile.id,
        name: `${original.name} (copy)`.slice(0, SPACE_NAME_MAX_LENGTH),
        description: original.description,
        color: original.color,
      })
      .returning();

    if (!row) return { ok: false, error: "The space could not be duplicated." };

    const originalPages = await db
      .select()
      .from(pages)
      .where(eq(pages.spaceId, id));

    if (originalPages.length > 0) {
      await db.insert(pages).values(
        originalPages.map((page) => ({
          spaceId: row.id,
          userId: profile.id,
          title: page.title,
          template: page.template,
          description: page.description,
          content: normalizePageContent(page.content),
          plainText: page.plainText,
          commentsCount: page.commentsCount,
          linkedTasksCount: page.linkedTasksCount,
          lastEditedById: profile.id,
        })),
      );
    }

    const originalMembers = await db
      .select()
      .from(spaceMembers)
      .where(eq(spaceMembers.spaceId, id));

    if (originalMembers.length > 0) {
      await db.insert(spaceMembers).values(
        originalMembers.map((member) => ({
          spaceId: row.id,
          userId: member.userId,
          email: member.email,
          role: member.role,
        })),
      );
    }

    revalidatePages();

    const pageRows = await db
      .select({
        id: pages.id,
        spaceId: pages.spaceId,
        title: pages.title,
        favorite: pages.favorite,
        archived: pages.archived,
      })
      .from(pages)
      .where(eq(pages.spaceId, row.id));
    const members = await getSpaceMembers(row.id);

    return {
      ok: true,
      data: {
        id: row.id,
        userId: row.userId,
        name: row.name,
        description: row.description,
        color: normalizeColor(row.color),
        favorite: row.favorite,
        archived: row.archived,
        lastOpenedAt: row.lastOpenedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        accessRole: "owner",
        ...collectPageStats(pageRows, row.id),
        members: members.ok ? members.data : [],
      },
    };
  } catch (error) {
    return fail(error);
  }
}

/** Records that the viewer opened a space, powering "Recently Opened". */
export async function markSpaceOpened(id: number): Promise<ActionResult<{ id: number }>> {
  try {
    const profile = await requireProfile();
    const access = await getSpaceAccess(profile, id);

    if (!access) return { ok: false, error: "That space is not available." };

    await db
      .update(spaces)
      .set({ lastOpenedAt: new Date() })
      .where(eq(spaces.id, id));

    revalidatePages();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error);
  }
}

/* ── page mutations ─────────────────────────────────────────────────────── */

/** Bumps the parent space so "Recently Updated" stays meaningful. */
async function touchSpace(spaceId: number) {
  await db
    .update(spaces)
    .set({ updatedAt: new Date() })
    .where(eq(spaces.id, spaceId));
}

function toPage(
  row: typeof pages.$inferSelect,
  lastEditedByName: string | null,
): SpacePage {
  return {
    id: row.id,
    spaceId: row.spaceId,
    userId: row.userId,
    title: row.title,
    template: isPageTemplate(row.template) ? row.template : "blank",
    description: row.description,
    content: normalizePageContent(row.content),
    plainText: row.plainText,
    favorite: row.favorite,
    archived: row.archived,
    commentsCount: row.commentsCount,
    linkedTasksCount: row.linkedTasksCount,
    lastEditedById: row.lastEditedById,
    lastEditedByName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function resolveEditorName(userId: number | null): Promise<string | null> {
  if (!userId) return null;

  const [editor] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return editor ? getUserDisplayName(editor.name, editor.email) : null;
}

export async function createPage(input: {
  spaceId: number;
  title: string;
  template?: string;
}): Promise<ActionResult<SpacePage>> {
  try {
    const profile = await requireProfile();
    const access = await getSpaceAccess(profile, input.spaceId);

    if (!access) return { ok: false, error: "That space is not available." };
    if (!canEditSpace(access.role)) {
      return { ok: false, error: "You cannot add pages to this space." };
    }

    const title = normalizePageTitle(input.title) || "Untitled page";
    const template = isPageTemplate(input.template) ? input.template : "blank";
    const content = getTemplateOption(template).content;
    const plainText = extractPageText(content);

    const [row] = await db
      .insert(pages)
      .values({
        spaceId: input.spaceId,
        userId: profile.id,
        title,
        template,
        description: null,
        content,
        plainText,
        lastEditedById: profile.id,
      })
      .returning();

    if (!row) return { ok: false, error: "The page could not be created." };

    await touchSpace(input.spaceId);
    revalidatePages();

    return {
      ok: true,
      data: toPage(row, await resolveEditorName(profile.id)),
    };
  } catch (error) {
    return fail(error);
  }
}

export async function updatePage(input: {
  id: number;
  title?: string;
  description?: string | null;
}): Promise<ActionResult<SpacePage>> {
  try {
    const profile = await requireProfile();
    const [existing] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, input.id))
      .limit(1);

    if (!existing) return { ok: false, error: "That page is not available." };

    const access = await getSpaceAccess(profile, existing.spaceId);
    if (!access) return { ok: false, error: "That page is not available." };
    if (!canEditSpace(access.role)) {
      return { ok: false, error: "You cannot change this page." };
    }

    const patch: Partial<typeof pages.$inferInsert> = {
      updatedAt: new Date(),
      lastEditedById: profile.id,
    };

    if (input.title !== undefined) {
      patch.title = normalizePageTitle(input.title) || "Untitled page";
    }

    if (input.description !== undefined) {
      patch.description = normalizePageDescription(input.description);
    }

    const [row] = await db
      .update(pages)
      .set(patch)
      .where(eq(pages.id, input.id))
      .returning();

    if (!row) return { ok: false, error: "That page is not available." };

    await touchSpace(row.spaceId);
    revalidatePages();

    return {
      ok: true,
      data: toPage(row, await resolveEditorName(profile.id)),
    };
  } catch (error) {
    return fail(error);
  }
}

/** Autosave endpoint used by the page editor. */
export async function savePageContent(input: {
  id: number;
  title: string;
  content: unknown;
}): Promise<ActionResult<PageSaveResult>> {
  try {
    const profile = await requireProfile();

    if (!isPageDocument(input.content)) {
      return { ok: false, error: "The page content was not valid." };
    }

    let contentSize = 0;
    try {
      contentSize = JSON.stringify(input.content).length;
    } catch {
      return { ok: false, error: "The page content was not valid." };
    }

    if (contentSize > MAX_CONTENT_BYTES) {
      return { ok: false, error: "This page is too large to save." };
    }

    const [existing] = await db
      .select({ spaceId: pages.spaceId })
      .from(pages)
      .where(eq(pages.id, input.id))
      .limit(1);

    if (!existing) return { ok: false, error: "That page is not available." };

    const access = await getSpaceAccess(profile, existing.spaceId);
    if (!access) return { ok: false, error: "That page is not available." };
    if (!canEditSpace(access.role)) {
      return { ok: false, error: "You cannot edit this page." };
    }

    const title = normalizePageTitle(input.title ?? "") || "Untitled page";
    const plainText = extractPageText(input.content).slice(0, 50_000);

    const [row] = await db
      .update(pages)
      .set({
        title,
        content: input.content,
        plainText,
        updatedAt: new Date(),
        lastEditedById: profile.id,
      })
      .where(eq(pages.id, input.id))
      .returning({
        updatedAt: pages.updatedAt,
        title: pages.title,
        plainText: pages.plainText,
      });

    if (!row) return { ok: false, error: "That page is not available." };

    await touchSpace(existing.spaceId);
    revalidatePages();

    return { ok: true, data: row };
  } catch (error) {
    return fail(error);
  }
}

export async function togglePageFavorite(
  id: number,
): Promise<ActionResult<SpacePage>> {
  try {
    const profile = await requireProfile();
    const [existing] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);

    if (!existing) return { ok: false, error: "That page is not available." };

    const access = await getSpaceAccess(profile, existing.spaceId);
    if (!access) return { ok: false, error: "That page is not available." };
    if (!canEditSpace(access.role)) {
      return { ok: false, error: "You cannot change this page." };
    }

    const [row] = await db
      .update(pages)
      .set({
        favorite: !existing.favorite,
        updatedAt: new Date(),
        lastEditedById: profile.id,
      })
      .where(eq(pages.id, id))
      .returning();

    if (!row) return { ok: false, error: "That page is not available." };

    await touchSpace(row.spaceId);
    revalidatePages();

    return {
      ok: true,
      data: toPage(row, await resolveEditorName(profile.id)),
    };
  } catch (error) {
    return fail(error);
  }
}

/** Moves a page into another space. */
export async function movePage(input: {
  id: number;
  spaceId: number;
}): Promise<ActionResult<SpacePage>> {
  try {
    const profile = await requireProfile();
    const [existing] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, input.id))
      .limit(1);

    if (!existing) return { ok: false, error: "That page is not available." };

    const source = await getSpaceAccess(profile, existing.spaceId);
    const target = await getSpaceAccess(profile, input.spaceId);

    if (!source || !target) {
      return { ok: false, error: "That page is not available." };
    }
    if (!canEditSpace(source.role) || !canEditSpace(target.role)) {
      return { ok: false, error: "You cannot move this page." };
    }

    const [row] = await db
      .update(pages)
      .set({
        spaceId: input.spaceId,
        updatedAt: new Date(),
        lastEditedById: profile.id,
      })
      .where(eq(pages.id, input.id))
      .returning();

    if (!row) return { ok: false, error: "That page is not available." };

    await touchSpace(existing.spaceId);
    await touchSpace(input.spaceId);
    revalidatePages();

    return {
      ok: true,
      data: toPage(row, await resolveEditorName(profile.id)),
    };
  } catch (error) {
    return fail(error);
  }
}

export async function duplicatePage(id: number): Promise<ActionResult<SpacePage>> {
  try {
    const profile = await requireProfile();
    const [existing] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);

    if (!existing) return { ok: false, error: "That page is not available." };

    const access = await getSpaceAccess(profile, existing.spaceId);
    if (!access) return { ok: false, error: "That page is not available." };
    if (!canEditSpace(access.role)) {
      return { ok: false, error: "You cannot duplicate this page." };
    }

    const [row] = await db
      .insert(pages)
      .values({
        spaceId: existing.spaceId,
        userId: profile.id,
        title: `${pageTitle(existing.title)} (copy)`.slice(
          0,
          PAGE_TITLE_MAX_LENGTH,
        ),
        template: existing.template,
        description: existing.description,
        content: normalizePageContent(existing.content),
        plainText: existing.plainText,
        commentsCount: existing.commentsCount,
        linkedTasksCount: existing.linkedTasksCount,
        lastEditedById: profile.id,
      })
      .returning();

    if (!row) return { ok: false, error: "The page could not be duplicated." };

    await touchSpace(row.spaceId);
    revalidatePages();

    return {
      ok: true,
      data: toPage(row, await resolveEditorName(profile.id)),
    };
  } catch (error) {
    return fail(error);
  }
}

export async function setPageArchived(
  id: number,
  archived: boolean,
): Promise<ActionResult<{ id: number; archived: boolean }>> {
  try {
    const profile = await requireProfile();
    const [existing] = await db
      .select({ spaceId: pages.spaceId })
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);

    if (!existing) return { ok: false, error: "That page is not available." };

    const access = await getSpaceAccess(profile, existing.spaceId);
    if (!access) return { ok: false, error: "That page is not available." };
    if (!canEditSpace(access.role)) {
      return { ok: false, error: "You cannot archive this page." };
    }

    const [row] = await db
      .update(pages)
      .set({
        archived,
        updatedAt: new Date(),
        lastEditedById: profile.id,
      })
      .where(eq(pages.id, id))
      .returning({ id: pages.id, archived: pages.archived });

    if (!row) return { ok: false, error: "That page is not available." };

    await touchSpace(existing.spaceId);
    revalidatePages();
    return { ok: true, data: row };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePage(id: number): Promise<ActionResult<{ id: number }>> {
  try {
    const profile = await requireProfile();
    const [existing] = await db
      .select({ spaceId: pages.spaceId })
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);

    if (!existing) return { ok: false, error: "That page is not available." };

    const access = await getSpaceAccess(profile, existing.spaceId);
    if (!access) return { ok: false, error: "That page is not available." };
    if (!canEditSpace(access.role)) {
      return { ok: false, error: "You cannot delete this page." };
    }

    const [row] = await db
      .delete(pages)
      .where(eq(pages.id, id))
      .returning({ id: pages.id });

    if (!row) return { ok: false, error: "That page is not available." };

    await touchSpace(existing.spaceId);
    revalidatePages();
    return { ok: true, data: row };
  } catch (error) {
    return fail(error);
  }
}

/* ── members ────────────────────────────────────────────────────────────── */

export async function inviteSpaceMember(input: {
  spaceId: number;
  email: string;
}): Promise<ActionResult<SpaceMember>> {
  try {
    const profile = await requireProfile();
    const access = await getSpaceAccess(profile, input.spaceId);

    if (!access) return { ok: false, error: "That space is not available." };
    if (!isSpaceOwner(access.role)) {
      return { ok: false, error: "Only the owner can invite people." };
    }

    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { ok: false, error: "Enter a valid email address." };
    }

    if (email === profile.email.trim().toLowerCase()) {
      return { ok: false, error: "You already own this space." };
    }

    const [existing] = await db
      .select()
      .from(spaceMembers)
      .where(
        and(
          eq(spaceMembers.spaceId, input.spaceId),
          eq(spaceMembers.email, email),
        ),
      )
      .limit(1);

    if (existing) {
      return { ok: false, error: "That person is already a member." };
    }

    const [invitee] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const [row] = await db
      .insert(spaceMembers)
      .values({
        spaceId: input.spaceId,
        userId: invitee?.id ?? null,
        email,
        role: "editor",
      })
      .returning();

    if (!row) return { ok: false, error: "The invite could not be saved." };

    revalidatePages();

    return {
      ok: true,
      data: toSpaceMember({
        id: row.id,
        userId: row.userId,
        name: invitee?.name ?? null,
        email: row.email,
        role: "editor",
        status: row.userId ? "active" : "pending",
      }),
    };
  } catch (error) {
    return fail(error);
  }
}

export async function removeSpaceMember(input: {
  spaceId: number;
  memberId: number;
}): Promise<ActionResult<{ id: number }>> {
  try {
    const profile = await requireProfile();
    const access = await getSpaceAccess(profile, input.spaceId);

    if (!access) return { ok: false, error: "That space is not available." };
    if (!isSpaceOwner(access.role)) {
      return { ok: false, error: "Only the owner can remove people." };
    }

    const [row] = await db
      .delete(spaceMembers)
      .where(
        and(
          eq(spaceMembers.id, input.memberId),
          eq(spaceMembers.spaceId, input.spaceId),
        ),
      )
      .returning({ id: spaceMembers.id });

    if (!row) return { ok: false, error: "That person is not a member." };

    revalidatePages();
    return { ok: true, data: row };
  } catch (error) {
    return fail(error);
  }
}

/* ── shared helpers used by the views ───────────────────────────────────── */

/**
 * Rewrites the selected text with Gemini. Mirrors the Notes AI Refine action
 * but checks that the viewer may edit the page the selection came from.
 */
export async function refinePageText(input: {
  pageId: number;
  text: string;
  mode: RefineMode;
  tone?: RefineTone;
}): Promise<ActionResult<{ text: string }>> {
  try {
    const profile = await requireProfile();

    const [existing] = await db
      .select({ spaceId: pages.spaceId })
      .from(pages)
      .where(eq(pages.id, input.pageId))
      .limit(1);

    if (!existing) return { ok: false, error: "That page is not available." };

    const access = await getSpaceAccess(profile, existing.spaceId);
    if (!access) return { ok: false, error: "That page is not available." };
    if (!canEditSpace(access.role)) {
      return { ok: false, error: "You cannot edit this page." };
    }

    const text = input.text.trim();
    if (!text) return { ok: false, error: "Select some text first." };

    if (text.length > PAGE_SELECTION_MAX_LENGTH) {
      return {
        ok: false,
        error: "That selection is too long for AI Refine. Select less text.",
      };
    }

    if (!(REFINE_MODES as readonly string[]).includes(input.mode)) {
      return { ok: false, error: "That AI Refine action is not available." };
    }

    const tone =
      input.tone && (REFINE_TONES as readonly string[]).includes(input.tone)
        ? input.tone
        : "professional";

    const refined = await refineTextWithGemini({
      text,
      mode: input.mode,
      tone,
    });

    return { ok: true, data: { text: refined } };
  } catch (error) {
    if (error instanceof AiRefineError) {
      return { ok: false, error: error.message };
    }
    return fail(error);
  }
}

/** Spaces the viewer can add pages to, used by the "Add to Space" dropdown. */
export async function getSpaceOptions(): Promise<
  ActionResult<Array<{ id: number; name: string; color: ColorToken }>>
> {
  try {
    const profile = await requireProfile();
    const roles = await getAccessibleSpaceRoles(profile);
    const spaceIds = [...roles.keys()].filter(
      (id) => roles.get(id) !== "viewer",
    );

    if (spaceIds.length === 0) return { ok: true, data: [] };

    const rows = await db
      .select({ id: spaces.id, name: spaces.name, color: spaces.color })
      .from(spaces)
      .where(and(inArray(spaces.id, spaceIds), ne(spaces.archived, true)))
      .orderBy(asc(spaces.name));

    return {
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        color: normalizeColor(row.color),
      })),
    };
  } catch (error) {
    return fail(error);
  }
}
