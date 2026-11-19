"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { templateApps } from "@/db/schema";
import { resolveCurrentUserId } from "@/lib/calendar/user";
import {
  generateTemplateApp,
  TemplateAppAiError,
} from "@/lib/template-builder/ai";
import type { TemplateApp, TemplateAppConfig } from "@/lib/template-builder/types";
import { ActionResult } from "@/lib/notes/types";

const MAX_SIDEBAR_APPS = 3;

function fail(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error ? error.message : "Something went wrong. Try again.";
  console.error("Template builder action failed", error);
  return { ok: false, error: message };
}

function toTemplateApp(
  row: typeof templateApps.$inferSelect,
): TemplateApp {
  return {
    id: row.id,
    userId: row.userId,
    appName: row.appName,
    description: row.description ?? "",
    icon: row.icon,
    color: row.color,
    layout: row.layout,
    config: row.config as TemplateAppConfig,
    sidebarPosition: row.sidebarPosition ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function requireUserId(): Promise<number> {
  const id = await resolveCurrentUserId();
  if (!id) {
    throw new Error("No workspace user could be found.");
  }
  return id;
}

function validateConfig(config: TemplateAppConfig): TemplateAppConfig {
  if (!config.appName) {
    throw new Error("The generated app is missing a name.");
  }
  if (!Array.isArray(config.sections)) {
    config.sections = [];
  }
  return config;
}

/* ── reads ─────────────────────────────────────────────────────────────── */

export async function getTemplateApps(): Promise<ActionResult<TemplateApp[]>> {
  try {
    const userId = await requireUserId();

    const rows = await db
      .select()
      .from(templateApps)
      .where(eq(templateApps.userId, userId))
      .orderBy(desc(templateApps.createdAt), desc(templateApps.id));

    return { ok: true, data: rows.map(toTemplateApp) };
  } catch (error) {
    return fail(error);
  }
}

export async function getTemplateApp(
  id: number,
): Promise<ActionResult<TemplateApp>> {
  try {
    const userId = await requireUserId();

    const [row] = await db
      .select()
      .from(templateApps)
      .where(and(eq(templateApps.id, id), eq(templateApps.userId, userId)))
      .limit(1);

    if (!row) {
      return { ok: false, error: "That template could not be found." };
    }

    return { ok: true, data: toTemplateApp(row) };
  } catch (error) {
    return fail(error);
  }
}

/* ── creation ──────────────────────────────────────────────────────────── */

export async function createTemplateApp(input: {
  config: TemplateAppConfig;
}): Promise<ActionResult<TemplateApp>> {
  try {
    const userId = await requireUserId();

    let config: TemplateAppConfig;
    try {
      config = validateConfig(input.config);
    } catch (error) {
      return fail(error);
    }

    const [row] = await db
      .insert(templateApps)
      .values({
        userId,
        appName: config.appName,
        description: config.description,
        icon: config.icon,
        color: config.color,
        layout: config.layout,
        config,
      })
      .returning();

    if (!row) {
      return { ok: false, error: "The template app could not be created." };
    }

    revalidatePath("/template-builder");
    return { ok: true, data: toTemplateApp(row) };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Generate a template app from a user prompt and save it in one step.
 * Generation is server-only so the Gemini key never reaches the client.
 */
export async function createTemplateAppFromPrompt(input: {
  prompt: string;
}): Promise<ActionResult<TemplateApp>> {
  try {
    await requireUserId();

    const prompt = input.prompt.trim();
    if (!prompt) {
      return { ok: false, error: "Please enter a prompt." };
    }

    let config: TemplateAppConfig;
    try {
      config = await generateTemplateApp(prompt);
    } catch (error) {
      if (error instanceof TemplateAppAiError) {
        return { ok: false, error: error.message };
      }
      return fail(error);
    }

    return createTemplateApp({ config });
  } catch (error) {
    return fail(error);
  }
}

/* ── deletion ──────────────────────────────────────────────────────────── */

export async function deleteTemplateApp(
  id: number,
): Promise<ActionResult<{ id: number }>> {
  try {
    const userId = await requireUserId();

    const [row] = await db
      .delete(templateApps)
      .where(and(eq(templateApps.id, id), eq(templateApps.userId, userId)))
      .returning({ id: templateApps.id });

    if (!row) {
      return { ok: false, error: "That template app no longer exists." };
    }

    revalidatePath("/template-builder");
    return { ok: true, data: { id: row.id } };
  } catch (error) {
    return fail(error);
  }
}

/* ── sidebar pinning ───────────────────────────────────────────────────── */

export async function setSidebarPosition(input: {
  id: number;
  position: number | null;
}): Promise<ActionResult<void>> {
  try {
    const userId = await requireUserId();

    // Verify the app belongs to the user.
    const [row] = await db
      .select()
      .from(templateApps)
      .where(and(eq(templateApps.id, input.id), eq(templateApps.userId, userId)))
      .limit(1);

    if (!row) {
      return { ok: false, error: "That template app no longer exists." };
    }

    if (input.position !== null) {
      const allApps = await db
        .select()
        .from(templateApps)
        .where(eq(templateApps.userId, userId))
        .orderBy(templateApps.sidebarPosition, templateApps.updatedAt);

      const allPinned = allApps.filter((app) => app.sidebarPosition !== null);

      if (allPinned.length >= MAX_SIDEBAR_APPS && row.sidebarPosition === null) {
        return {
          ok: false,
          error: `You can pin at most ${MAX_SIDEBAR_APPS} apps to the sidebar. Remove one first.`,
        };
      }

      const updates: Promise<unknown>[] = [];

      if (allPinned.some((app) => app.id === row.id && row.sidebarPosition !== null)) {
        // App is already pinned: remove it from the list before re-ordering.
        const others = allPinned.filter((app) => app.id !== row.id);
        const target = Math.min(Math.max(input.position ?? 0, 0), others.length);
        for (const app of others) {
          const nextPosition =
            (app.sidebarPosition ?? 0) >= target
              ? (app.sidebarPosition ?? 0) + 1
              : app.sidebarPosition;
          updates.push(
            db
              .update(templateApps)
              .set({ sidebarPosition: nextPosition === -1 ? null : nextPosition })
              .where(eq(templateApps.id, app.id)),
          );
        }
        updates.push(
          db
            .update(templateApps)
            .set({ sidebarPosition: target })
            .where(eq(templateApps.id, row.id)),
        );
      } else {
        const target = Math.min(
          Math.max(input.position ?? allPinned.length, 0),
          allPinned.length,
        );
        for (const app of allPinned) {
          const nextPosition =
            (app.sidebarPosition ?? 0) >= target
              ? (app.sidebarPosition ?? 0) + 1
              : app.sidebarPosition;
          updates.push(
            db
              .update(templateApps)
              .set({ sidebarPosition: nextPosition })
              .where(eq(templateApps.id, app.id)),
          );
        }
        updates.push(
          db
            .update(templateApps)
            .set({ sidebarPosition: target })
            .where(eq(templateApps.id, row.id)),
        );
      }

      await Promise.all(updates);
    } else {
      await db
        .update(templateApps)
        .set({ sidebarPosition: null })
        .where(eq(templateApps.id, row.id));
    }

    revalidatePath("/template-builder");
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}
