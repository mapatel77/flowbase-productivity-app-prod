"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { whiteboards } from "@/db/schema";
import { isColorToken, type ColorToken } from "@/lib/calendar/colors";
import { resolveCurrentUserProfile } from "@/lib/calendar/user";
import { getAiRuntimePreferences } from "@/lib/settings/ai";
import { WHITEBOARD_DEFAULT_COLOR } from "@/lib/whiteboard/constants";
import type {
  ActionResult,
  AiDiagramKind,
  AiDiagramSpec,
  Whiteboard,
  WhiteboardSaveResult,
  WhiteboardScene,
} from "@/lib/whiteboard/types";
import { AiDiagramError, generateDiagramWithGemini } from "@/lib/whiteboard/ai";

const EMPTY_SCENE: WhiteboardScene = {
  elements: [],
  appState: { viewBackgroundColor: "#fbfaf7", gridSize: 20 },
  files: {},
};

function fail(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error ? error.message : "Something went wrong. Try again.";
  console.error("Whiteboard action failed", error);
  return { ok: false, error: message };
}

function toWhiteboard(row: typeof whiteboards.$inferSelect): Whiteboard {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    color: isColorToken(row.color) ? row.color : WHITEBOARD_DEFAULT_COLOR,
    scene: (row.scene as WhiteboardScene | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function requireUserId() {
  const profile = await resolveCurrentUserProfile();
  if (!profile) {
    throw new Error("No workspace user could be found.");
  }
  return profile.id;
}

/* ── reads ─────────────────────────────────────────────────────────────── */

export async function getWhiteboardsData(): Promise<ActionResult<Whiteboard[]>> {
  try {
    const userId = await requireUserId();

    const rows = await db
      .select()
      .from(whiteboards)
      .where(eq(whiteboards.userId, userId))
      .orderBy(desc(whiteboards.updatedAt), desc(whiteboards.id));

    return { ok: true, data: rows.map(toWhiteboard) };
  } catch (error) {
    return fail(error);
  }
}

export async function getWhiteboardScene(
  id: number,
): Promise<ActionResult<WhiteboardScene>> {
  try {
    const userId = await requireUserId();

    const rows = await db
      .select({ scene: whiteboards.scene })
      .from(whiteboards)
      .where(and(eq(whiteboards.id, id), eq(whiteboards.userId, userId)))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return { ok: false, error: "That whiteboard no longer exists." };
    }

    const scene = (row.scene as WhiteboardScene | null) ?? EMPTY_SCENE;
    return { ok: true, data: scene };
  } catch (error) {
    return fail(error);
  }
}

/* ── whiteboard CRUD ────────────────────────────────────────────────────── */

export async function createWhiteboard(): Promise<ActionResult<Whiteboard>> {
  try {
    const userId = await requireUserId();

    const [row] = await db
      .insert(whiteboards)
      .values({
        userId,
        name: "Untitled whiteboard",
        color: WHITEBOARD_DEFAULT_COLOR,
        scene: EMPTY_SCENE,
      })
      .returning();

    if (!row) return { ok: false, error: "The whiteboard could not be created." };

    revalidatePath("/whiteboard");
    return { ok: true, data: toWhiteboard(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function renameWhiteboard(input: {
  id: number;
  name: string;
  color?: ColorToken;
}): Promise<ActionResult<Whiteboard>> {
  try {
    const userId = await requireUserId();
    const name = input.name.trim().slice(0, 80);

    if (!name) return { ok: false, error: "The whiteboard name cannot be empty." };

    const color =
      input.color && isColorToken(input.color) ? input.color : WHITEBOARD_DEFAULT_COLOR;

    const [row] = await db
      .update(whiteboards)
      .set({ name, color, updatedAt: new Date() })
      .where(and(eq(whiteboards.id, input.id), eq(whiteboards.userId, userId)))
      .returning();

    if (!row) return { ok: false, error: "That whiteboard no longer exists." };

    revalidatePath("/whiteboard");
    return { ok: true, data: toWhiteboard(row) };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteWhiteboard(id: number): Promise<ActionResult<{ id: number }>> {
  try {
    const userId = await requireUserId();

    const [row] = await db
      .delete(whiteboards)
      .where(and(eq(whiteboards.id, id), eq(whiteboards.userId, userId)))
      .returning({ id: whiteboards.id });

    if (!row) return { ok: false, error: "That whiteboard no longer exists." };

    revalidatePath("/whiteboard");
    return { ok: true, data: { id: row.id } };
  } catch (error) {
    return fail(error);
  }
}

export async function duplicateWhiteboard(id: number): Promise<ActionResult<Whiteboard>> {
  try {
    const userId = await requireUserId();

    const rows = await db
      .select()
      .from(whiteboards)
      .where(and(eq(whiteboards.id, id), eq(whiteboards.userId, userId)))
      .limit(1);

    const original = rows[0];
    if (!original) return { ok: false, error: "That whiteboard no longer exists." };

    const [row] = await db
      .insert(whiteboards)
      .values({
        userId,
        name: `${original.name} (copy)`.slice(0, 80),
        color: original.color,
        scene: original.scene ?? EMPTY_SCENE,
      })
      .returning();

    if (!row) return { ok: false, error: "The whiteboard could not be duplicated." };

    revalidatePath("/whiteboard");
    return { ok: true, data: toWhiteboard(row) };
  } catch (error) {
    return fail(error);
  }
}

/* ── autosave ──────────────────────────────────────────────────────────── */

export async function saveWhiteboardScene(input: {
  id: number;
  scene: WhiteboardScene;
}): Promise<ActionResult<WhiteboardSaveResult>> {
  try {
    const userId = await requireUserId();

    const serialized = JSON.stringify(input.scene);
    if (serialized.length > 8_000_000) {
      return { ok: false, error: "This whiteboard is too large to save." };
    }

    const elements = Array.isArray(input.scene?.elements) ? input.scene.elements : [];
    if (elements.length > 500) {
      return { ok: false, error: "This whiteboard has too many elements to save." };
    }

    const [row] = await db
      .update(whiteboards)
      .set({
        scene: input.scene,
        updatedAt: new Date(),
      })
      .where(and(eq(whiteboards.id, input.id), eq(whiteboards.userId, userId)))
      .returning({ updatedAt: whiteboards.updatedAt });

    if (!row) return { ok: false, error: "That whiteboard no longer exists." };

    return { ok: true, data: { updatedAt: row.updatedAt } };
  } catch (error) {
    return fail(error);
  }
}

/* ── AI diagram ────────────────────────────────────────────────────────── */

export async function generateAiDiagram(input: {
  prompt: string;
  kind: AiDiagramKind;
}): Promise<AiDiagramSpec> {
  const profile = await resolveCurrentUserProfile();
  if (!profile) {
    throw new AiDiagramError("No workspace user could be found.");
  }

  const ai = await getAiRuntimePreferences(profile);
  if (!ai.settings.aiDiagramEnabled) {
    throw new AiDiagramError(
      "AI diagrams are turned off in your Settings.",
    );
  }

  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new AiDiagramError("Describe the diagram you want first.");
  }

  return generateDiagramWithGemini({
    prompt,
    kind: input.kind,
    model: ai.model,
    customInstructions: ai.customInstructions,
  });
}
