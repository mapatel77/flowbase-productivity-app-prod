/**
 * Server-only helpers for the AI Assistant.
 *
 * This module is deliberately *not* a `"use server"` file: it is only ever
 * imported by API route handlers, and the server-action transform turns every
 * export into a client reference, which cannot be called directly from a
 * route.
 */

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  calendarCategories,
  calendarEntries,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
  notes,
  templateApps,
  userSettings,
  users,
} from "@/db/schema";
import { assertCanCreateResource } from "@/lib/billing/plan";
import { isColorToken, type ColorToken } from "@/lib/calendar/colors";
import type { CalendarCategory, CategoryScope } from "@/lib/calendar/types";
import { resolveCurrentUserProfile, resolveCurrentUserId } from "@/lib/calendar/user";
import {
  canEditBoard,
  getAccessibleBoardRoles,
  getBoardAccess,
  isBoardOwner,
} from "@/lib/kanban/access";
import {
  DEFAULT_COLUMNS,
  MAX_COLUMNS,
  MAX_LABEL_LENGTH,
  MAX_TASK_LABELS,
} from "@/lib/kanban/constants";
import type {
  KanbanBoard,
  KanbanBoardRole,
  KanbanColumn,
  KanbanLabel,
  KanbanPriority,
  KanbanTask,
  TaskMutationResult,
} from "@/lib/kanban/types";
import { KANBAN_PRIORITIES } from "@/lib/kanban/types";
import { getCategoriesForScope, getUserSettings } from "@/lib/settings/queries";
import {
  getFunctionParameters,
  TOOL_DEFINITIONS,
  type AiToolDefinition,
} from "@/app/ai-assistant/tool-definitions";
import {
  createEmptyNoteContent,
  extractPlainText,
  isNoteDocument,
  normalizeNoteContent,
  normalizeNoteTitle,
  noteTitle,
} from "@/lib/notes/content";
import {
  REFINE_MODES,
  REFINE_TONES,
  type RefineMode,
  type RefineTone,
} from "@/lib/notes/types";
import {
  generateTemplateApp,
  TemplateAppAiError,
} from "@/lib/template-builder/ai";
import type { TemplateApp, TemplateAppConfig } from "@/lib/template-builder/types";
import {
  DEFAULT_NOTE_COLOR,
  DEFAULT_NOTE_TITLE,
  NOTE_SELECTION_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
} from "@/lib/notes/constants";
import { ActionResult } from "@/lib/notes/types";
import { getAiRuntimePreferences } from "@/lib/settings/ai";

const MAX_CONTENT_BYTES = 2_000_000;

function fail(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error ? error.message : "Something went wrong. Try again.";
  console.error("AI Assistant action failed", error);
  return { ok: false, error: message };
}

function isPriority(value: unknown): value is KanbanPriority {
  return (
    typeof value === "string" &&
    (KANBAN_PRIORITIES as readonly string[]).includes(value)
  );
}

function normalizeLabels(value: unknown): KanbanLabel[] {
  if (!Array.isArray(value)) return [];

  const labels: KanbanLabel[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const record = item as { name?: unknown; color?: unknown };
    if (typeof record.name !== "string") continue;

    const name = record.name.trim().slice(0, MAX_LABEL_LENGTH);
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    labels.push({
      name,
      color: isColorToken(record.color) ? record.color : "sky",
    });

    if (labels.length >= MAX_TASK_LABELS) break;
  }

  return labels;
}

function toBoard(
  row: typeof kanbanBoards.$inferSelect,
  accessRole: KanbanBoardRole = "owner",
): KanbanBoard {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    color: isColorToken(row.color) ? row.color : "sky",
    accessRole,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toColumn(row: typeof kanbanColumns.$inferSelect): KanbanColumn {
  return {
    id: row.id,
    boardId: row.boardId,
    userId: row.userId,
    name: row.name,
    position: row.position,
    createdAt: row.createdAt,
  };
}

function toTask(row: typeof kanbanTasks.$inferSelect): KanbanTask {
  return {
    id: row.id,
    boardId: row.boardId,
    columnId: row.columnId,
    userId: row.userId,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate,
    priority: isPriority(row.priority) ? row.priority : "medium",
    labels: normalizeLabels(row.labels),
    position: row.position,
    calendarEntryId: row.calendarEntryId,
    notesLinked: row.notesLinked,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toNote(row: typeof notes.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    title: row.title,
    color: isColorToken(row.color) ? row.color : DEFAULT_NOTE_COLOR,
    content: normalizeNoteContent(row.content),
    plainText: row.plainText,
    pinned: row.pinned,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toCategory(row: typeof calendarCategories.$inferSelect): CalendarCategory {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    color: isColorToken(row.color) ? row.color : "sky",
    scope: row.scope as CategoryScope,
    icon: row.icon,
    createdAt: row.createdAt,
  };
}

function toEntry(row: typeof calendarEntries.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    notes: row.notes,
    kind: row.kind === "reminder" ? "reminder" : "task",
    categoryId: row.categoryId,
    scheduledDate: row.scheduledDate,
    scheduledTime: row.scheduledTime,
    done: row.done,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
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

function toUserSettings(row: typeof userSettings.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    aiModel: row.aiModel,
    aiDefaultMode: row.aiDefaultMode,
    aiTone: row.aiTone,
    aiCustomInstructions: row.aiCustomInstructions,
    aiRefineEnabled: row.aiRefineEnabled,
    aiAssistantEnabled: row.aiAssistantEnabled,
    aiTemplateBuilderEnabled: row.aiTemplateBuilderEnabled,
    aiDiagramEnabled: row.aiDiagramEnabled,
    theme: row.theme,
    calendarDefaultView: row.calendarDefaultView,
    defaultTaskPriority: row.defaultTaskPriority,
    autoSaveEnabled: row.autoSaveEnabled,
    notifyTaskReminders: row.notifyTaskReminders,
    notifyDueDates: row.notifyDueDates,
    notifyWeeklyDigest: row.notifyWeeklyDigest,
    notifyProductUpdates: row.notifyProductUpdates,
    privacyProfileDiscoverable: row.privacyProfileDiscoverable,
    privacyShowActivity: row.privacyShowActivity,
    privacyAnalytics: row.privacyAnalytics,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function requireProfile() {
  const profile = await resolveCurrentUserProfile();
  if (!profile) throw new Error("No workspace user could be found.");
  return profile;
}

async function requireUserId(): Promise<number> {
  return (await requireProfile()).id;
}

async function nextTaskPosition(columnId: number): Promise<number> {
  const tail = await db
    .select({ position: kanbanTasks.position })
    .from(kanbanTasks)
    .where(eq(kanbanTasks.columnId, columnId))
    .orderBy(desc(kanbanTasks.position))
    .limit(1);

  return (tail[0]?.position ?? -1) + 1;
}

/* ── AI Chat ─────────────────────────────────────────────────────────────── */

export type AiMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: AiToolCall[];
  toolCallId?: string;
};

export type AiToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type AiToolResult = {
  toolCallId: string;
  name: string;
  result: unknown;
};

export type AiChatInput = {
  messages: AiMessage[];
  tools?: AiToolDefinition[];
  stream?: boolean;
};

async function callGemini(input: {
  messages: AiMessage[];
  tools?: AiToolDefinition[];
  model?: string;
  temperature?: number;
}): Promise<{ content: string; toolCalls?: AiToolCall[] }> {
  const profile = await requireProfile();
  const ai = await getAiRuntimePreferences(profile);
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const model = input.model ?? ai.model ?? "gemini-3.6-flash";
  const baseUrl = (process.env.GEMINI_API_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
  const endpoint = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // Build the system prompt with tool definitions
  const systemPrompt = [
    "You are Flowbase AI, a helpful productivity assistant inside the Flowbase app.",
    "You can help users manage tasks, calendar, notes, kanban boards, and templates.",
    "Use the available tools to perform actions on behalf of the user.",
    "When a user asks you to do something, first check if you have the right tool.",
    "If information is missing (like dates, board names, etc.), ask clarifying questions before taking action.",
    "For important actions (deleting, modifying existing data), ask for confirmation before proceeding.",
    "Be concise and helpful. Use a friendly, professional tone.",
    "",
    "Available tools:",
    ...(input.tools ?? TOOL_DEFINITIONS).map((t) => `- ${t.name}: ${t.description}`),
    "",
    "Current user context:",
    `User ID: ${profile.id}`,
  ].join("\n");

  const contents = input.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [
        {
          text:
            m.content +
            (m.toolCalls
              ? "\n\nTool calls:\n" +
                m.toolCalls
                  .map(
                    (tc) =>
                      `- ${tc.name}(${JSON.stringify(tc.arguments)}) [id: ${tc.id}]`,
                  )
                  .join("\n")
              : ""),
        },
      ],
    }));

  // Add tool results as user messages
  const toolResultMessages = input.messages
    .filter((m) => m.role === "system" && m.content.startsWith("tool_result:"))
    .map((m) => ({
      role: "user" as const,
      parts: [{ text: m.content }],
    }));

  const allContents = [...contents, ...toolResultMessages];

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: allContents,
        generationConfig: {
          temperature: input.temperature ?? 0.7,
          topP: 0.95,
          maxOutputTokens: 4000,
          responseMimeType: "text/plain",
        },
        tools: input.tools
          ? [
              {
                functionDeclarations: input.tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  parameters: getFunctionParameters(t.name),
                })),
              },
            ]
          : undefined,
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    console.error("Gemini request failed", error);
    throw new Error("AI Assistant could not reach the model. Check your connection and try again.");
  }

  const payload = (await response.json().catch(() => null)) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }>;
      };
      finishReason?: string;
    }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    const detail = payload?.error?.message;
    console.error("Gemini returned an error", response.status, detail);
    if (response.status === 400 || response.status === 403) {
      throw new Error("Gemini rejected the request. Check that GEMINI_API_KEY is valid.");
    }
    if (response.status === 429) {
      throw new Error("AI Assistant is busy right now. Wait a moment and try again.");
    }
    throw new Error("Gemini could not respond. Try again.");
  }

  const candidate = payload?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  let content = "";
  const toolCalls: AiToolCall[] = [];

  for (const part of parts) {
    if (part.text) {
      content += part.text;
    }
    if (part.functionCall) {
      toolCalls.push({
        id: crypto.randomUUID(),
        name: part.functionCall.name,
        arguments: part.functionCall.args,
      });
    }
  }

  return { content: content.trim(), toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}

export async function aiChat(input: AiChatInput): Promise<ActionResult<{ message: AiMessage; toolResults?: AiToolResult[] }>> {
  try {
    const profile = await requireProfile();
    if (!profile) return { ok: false, error: "No user found." };

    // Check if AI Assistant is enabled
    const settings = await getUserSettings(profile.id);
    if (!settings.aiAssistantEnabled) {
      return { ok: false, error: "AI Assistant is turned off in your Settings." };
    }

    let messages = [...input.messages];
    let toolResults: AiToolResult[] = [];
    let iterations = 0;
    const maxIterations = 3;

    while (iterations < maxIterations) {
      const result = await callGemini({
        messages,
        tools: TOOL_DEFINITIONS,
      });

      const assistantMessage: AiMessage = {
        role: "assistant",
        content: result.content,
        toolCalls: result.toolCalls,
      };

      messages.push(assistantMessage);

      if (!result.toolCalls || result.toolCalls.length === 0) {
        // No tool calls, we're done
        return { ok: true, data: { message: assistantMessage, toolResults } };
      }

      // Execute tool calls
      for (const toolCall of result.toolCalls) {
        const toolResult = await executeToolCall(toolCall, profile.id);
        toolResults.push(toolResult);
        
        // Add tool result to messages for next iteration
        messages.push({
          role: "system",
          content: `tool_result:${toolCall.id}:${JSON.stringify(toolResult.result)}`,
        } as AiMessage);
      }

      iterations++;
    }

    // Max iterations reached, return last assistant message
    return { ok: true, data: { message: messages[messages.length - 1] as AiMessage, toolResults } };
  } catch (error) {
    return fail(error);
  }
}

async function executeToolCall(
  toolCall: AiToolCall,
  userId: number,
): Promise<AiToolResult> {
  let result: unknown;

  try {
    switch (toolCall.name) {
      case "create_kanban_board": {
        const args = toolCall.arguments as {
          name: string;
          color?: string;
        };
        const color = isColorToken(args.color) ? args.color : "sky";
        const createResult = await createBoardInternal({ name: args.name, color, userId });
        result = createResult;
        break;
      }
      case "list_kanban_boards": {
        const listResult = await listBoardsInternal({ userId });
        result = listResult;
        break;
      }
      case "create_kanban_task": {
        const args = toolCall.arguments as {
          boardId: number;
          columnId: number;
          title: string;
          description?: string;
          dueDate?: string;
          priority?: KanbanPriority;
          labels?: KanbanLabel[];
          syncCalendar?: boolean;
        };
        const taskResult = await createTaskInternal({ ...args, userId });
        result = taskResult;
        break;
      }
      case "create_calendar_entry": {
        const args = toolCall.arguments as {
          title: string;
          notes?: string;
          kind?: "task" | "reminder";
          categoryId?: number;
          scheduledDate?: string;
          scheduledTime?: string;
        };
        const entryResult = await createCalendarEntryInternal({ ...args, userId });
        result = entryResult;
        break;
      }
      case "create_note": {
        const args = toolCall.arguments as {
          title?: string;
          color?: string;
          content?: unknown;
        };
        const noteResult = await createNoteInternal({ ...args, userId });
        result = noteResult;
        break;
      }
      case "generate_template_app": {
        const args = toolCall.arguments as { prompt: string };
        const templateResult = await generateTemplateAppInternal({ prompt: args.prompt, userId });
        result = templateResult;
        break;
      }
      case "update_user_settings": {
        const args = toolCall.arguments as Record<string, unknown>;
        const settingsResult = await updateUserSettingsInternal({ ...args, userId });
        result = settingsResult;
        break;
      }
      default:
        result = { error: `Unknown tool: ${toolCall.name}` };
    }
  } catch (error) {
    result = { error: error instanceof Error ? error.message : "Tool execution failed" };
  }

  return {
    toolCallId: toolCall.id,
    name: toolCall.name,
    result,
  };
}

/* ── AssemblyAI Voice Agent ───────────────────────────────────────────────── */

export type VoiceToolInput = {
  name: string;
  arguments?: Record<string, unknown> | string;
};

/**
 * Runs a single tool requested by the Voice Agent and returns the payload the
 * agent should receive. Exposed through `/api/ai-assistant/voice-tool` so the
 * browser can close the loop using the signed-in user's session.
 */
export async function executeVoiceTool(
  input: VoiceToolInput,
): Promise<ActionResult<{ result: unknown }>> {
  try {
    const profile = await requireProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const settings = await getUserSettings(profile.id);
    if (!settings.aiAssistantEnabled) {
      return { ok: false, error: "AI Assistant is turned off in your Settings." };
    }

    let args: Record<string, unknown> = {};
    if (typeof input.arguments === "string") {
      try {
        const parsed = JSON.parse(input.arguments);
        if (parsed && typeof parsed === "object") {
          args = parsed as Record<string, unknown>;
        }
      } catch {
        args = {};
      }
    } else if (input.arguments && typeof input.arguments === "object") {
      args = input.arguments;
    }

    const toolResult = await executeToolCall(
      { id: `voice_${Date.now()}`, name: input.name, arguments: args },
      profile.id,
    );

    // The internal implementations return an ActionResult; unwrap it so the
    // agent receives the plain payload (or a readable error).
    const raw = toolResult.result;
    if (raw && typeof raw === "object" && "ok" in raw) {
      const actionResult = raw as ActionResult<unknown>;
      if (!actionResult.ok) {
        return { ok: false, error: actionResult.error };
      }
      return { ok: true, data: { result: actionResult.data ?? {} } };
    }

    return { ok: true, data: { result: raw ?? {} } };
  } catch (error) {
    return fail(error);
  }
}

/* ── Internal tool implementations ───────────────────────────────────────── */

/**
 * Lists every Kanban board the user can access together with its columns, so
 * the assistant can resolve a board name into a real `boardId`/`columnId`.
 */
async function listBoardsInternal(input: {
  userId: number;
}): Promise<ActionResult<{ boards: Array<{
  id: number;
  name: string;
  color: string;
  columns: Array<{ id: number; name: string; position: number }>;
}> }>> {
  try {
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const roles = await getAccessibleBoardRoles(profile);
    const boardIds = [...roles.keys()];
    if (boardIds.length === 0) {
      return { ok: true, data: { boards: [] } };
    }

    const [boardRows, columnRows] = await Promise.all([
      db
        .select({
          id: kanbanBoards.id,
          name: kanbanBoards.name,
          color: kanbanBoards.color,
        })
        .from(kanbanBoards)
        .where(inArray(kanbanBoards.id, boardIds))
        .orderBy(asc(kanbanBoards.createdAt), asc(kanbanBoards.id)),
      db
        .select({
          id: kanbanColumns.id,
          boardId: kanbanColumns.boardId,
          name: kanbanColumns.name,
          position: kanbanColumns.position,
        })
        .from(kanbanColumns)
        .where(inArray(kanbanColumns.boardId, boardIds))
        .orderBy(asc(kanbanColumns.boardId), asc(kanbanColumns.position), asc(kanbanColumns.id)),
    ]);

    const boards = boardRows.map((board) => ({
      id: board.id,
      name: board.name,
      color: board.color,
      columns: columnRows
        .filter((column) => column.boardId === board.id)
        .map((column) => ({
          id: column.id,
          name: column.name,
          position: column.position,
        })),
    }));

    return { ok: true, data: { boards } };
  } catch (error) {
    return fail(error);
  }
}

async function createBoardInternal(input: {
  name: string;
  color: ColorToken;
  userId: number;
}): Promise<ActionResult<{ board: KanbanBoard; columns: KanbanColumn[] }>> {
  try {
    const limit = await assertCanCreateResource("boards");
    if (!limit.ok) return limit;

    const [boardRow] = await db
      .insert(kanbanBoards)
      .values({ userId: input.userId, name: input.name, color: input.color })
      .returning();

    const columnRows = await db
      .insert(kanbanColumns)
      .values(
        DEFAULT_COLUMNS.map((columnName, position) => ({
          boardId: boardRow.id,
          userId: input.userId,
          name: columnName,
          position,
        })),
      )
      .returning();

    revalidatePath("/tasks");

    return {
      ok: true,
      data: {
        board: toBoard(boardRow, "owner"),
        columns: columnRows.map(toColumn).sort((a, b) => a.position - b.position || a.id - b.id),
      },
    };
  } catch (error) {
    return fail(error);
  }
}

async function createTaskInternal(input: {
  boardId: number;
  columnId: number;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: KanbanPriority;
  labels?: KanbanLabel[];
  syncCalendar?: boolean;
  userId: number;
}): Promise<ActionResult<TaskMutationResult>> {
  try {
    const [column] = await db
      .select({ id: kanbanColumns.id, boardId: kanbanColumns.boardId })
      .from(kanbanColumns)
      .where(
        and(
          eq(kanbanColumns.id, input.columnId),
          eq(kanbanColumns.boardId, input.boardId),
        ),
      )
      .limit(1);

    if (!column) return { ok: false, error: "That column no longer exists." };

    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const access = await getBoardAccess(profile, input.boardId);
    if (!access) return { ok: false, error: "That board no longer exists." };
    if (!canEditBoard(access.role)) {
      return { ok: false, error: "You have view-only access to this board." };
    }

    const title = input.title.trim();
    if (!title) return { ok: false, error: "Give the task a title." };

    const dueDate = input.dueDate ? (isDateKey(input.dueDate) ? input.dueDate : toDateKey(new Date())) : null;

    const [row] = await db
      .insert(kanbanTasks)
      .values({
        boardId: input.boardId,
        columnId: input.columnId,
        userId: input.userId,
        title,
        description: input.description?.trim() || null,
        dueDate,
        priority: isPriority(input.priority) ? input.priority : "medium",
        labels: normalizeLabels(input.labels),
        position: await nextTaskPosition(input.columnId),
        notesLinked: false,
      })
      .returning();

    let task = toTask(row);
    let syncError: string | undefined;

    if (input.syncCalendar) {
      try {
        const entryId = await createCalendarEntryForTask(input.userId, task);
        if (entryId) {
          task = await linkTaskToCalendarEntry(task, entryId);
        } else {
          syncError = "The task was saved, but Calendar sync failed.";
        }
      } catch (error) {
        console.error("Failed to sync a Kanban task to Calendar", error);
        syncError = "The task was saved, but Calendar sync failed.";
      }
    }

    revalidatePath("/tasks");
    if (input.syncCalendar) revalidatePath("/calendar");

    return { ok: true, data: { task, syncError } };
  } catch (error) {
    return fail(error);
  }
}

async function createCalendarEntryForTask(
  userId: number,
  task: KanbanTask,
): Promise<number | null> {
  const [row] = await db
    .insert(calendarEntries)
    .values({
      userId,
      title: task.title,
      notes: task.description,
      kind: "task",
      scheduledDate: task.dueDate,
      done: false,
    })
    .returning({ id: calendarEntries.id });

  return row?.id ?? null;
}

async function linkTaskToCalendarEntry(
  task: KanbanTask,
  entryId: number,
): Promise<KanbanTask> {
  const [row] = await db
    .update(kanbanTasks)
    .set({ calendarEntryId: entryId, updatedAt: new Date() })
    .where(eq(kanbanTasks.id, task.id))
    .returning();

  return row ? toTask(row) : task;
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

async function createCalendarEntryInternal(input: {
  title: string;
  notes?: string;
  kind?: "task" | "reminder";
  categoryId?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  userId: number;
}): Promise<ActionResult<ReturnType<typeof toEntry>>> {
  try {
    const limit = await assertCanCreateResource("calendar");
    if (!limit.ok) return limit;

    const [row] = await db
      .insert(calendarEntries)
      .values({
        userId: input.userId,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        kind: input.kind ?? "task",
        categoryId: input.categoryId ?? null,
        scheduledDate: input.scheduledDate ?? null,
        scheduledTime: input.scheduledTime ?? null,
      })
      .returning();

    revalidatePath("/calendar");
    return { ok: true, data: toEntry(row) };
  } catch (error) {
    return fail(error);
  }
}

async function createNoteInternal(input: {
  title?: string;
  color?: string;
  content?: unknown;
  userId: number;
}): Promise<ActionResult<ReturnType<typeof toNote>>> {
  try {
    const limit = await assertCanCreateResource("notes");
    if (!limit.ok) return limit;

    const title = input.title?.trim() || DEFAULT_NOTE_TITLE;
    const color = isColorToken(input.color) ? input.color : DEFAULT_NOTE_COLOR;
    const content = input.content
      ? normalizeNoteContent(input.content)
      : createEmptyNoteContent();

    const [row] = await db
      .insert(notes)
      .values({
        userId: input.userId,
        title: normalizeNoteTitle(title),
        color,
        content,
        plainText: extractPlainText(content),
      })
      .returning();

    if (!row) return { ok: false, error: "The note could not be created." };

    revalidatePath("/notes");
    return { ok: true, data: toNote(row) };
  } catch (error) {
    return fail(error);
  }
}

async function generateTemplateAppInternal(input: {
  prompt: string;
  userId: number;
}): Promise<ActionResult<TemplateApp>> {
  try {
    const profile = await resolveCurrentUserProfile();
    if (!profile) return { ok: false, error: "No user found." };

    const ai = await getAiRuntimePreferences(profile);
    if (!ai.settings.aiTemplateBuilderEnabled) {
      return { ok: false, error: "AI Template Builder is turned off in your Settings." };
    }

    const prompt = input.prompt.trim();
    if (!prompt) return { ok: false, error: "Please enter a prompt." };

    let config: TemplateAppConfig;
    try {
      config = await generateTemplateApp(prompt, {
        model: ai.model,
        customInstructions: ai.customInstructions,
      });
    } catch (error) {
      if (error instanceof TemplateAppAiError) {
        return { ok: false, error: error.message };
      }
      return fail(error);
    }

    const [row] = await db
      .insert(templateApps)
      .values({
        userId: input.userId,
        appName: config.appName,
        description: config.description,
        icon: config.icon,
        color: config.color,
        layout: config.layout,
        config,
      })
      .returning();

    if (!row) return { ok: false, error: "The template app could not be created." };

    revalidatePath("/template-builder");
    return { ok: true, data: toTemplateApp(row) };
  } catch (error) {
    return fail(error);
  }
}

async function updateUserSettingsInternal(input: Record<string, unknown> & { userId: number }): Promise<ActionResult<ReturnType<typeof toUserSettings>>> {
  try {
    const profile = await requireProfile();
    
    await getUserSettings(profile.id);
    const patch: Partial<typeof userSettings.$inferInsert> = {
      updatedAt: new Date(),
    };

    const allowedKeys = [
      "aiModel",
      "aiDefaultMode",
      "aiTone",
      "aiCustomInstructions",
      "theme",
      "calendarDefaultView",
      "defaultTaskPriority",
      "aiRefineEnabled",
      "aiAssistantEnabled",
      "aiTemplateBuilderEnabled",
      "aiDiagramEnabled",
      "autoSaveEnabled",
      "notifyTaskReminders",
      "notifyDueDates",
      "notifyWeeklyDigest",
      "notifyProductUpdates",
      "privacyProfileDiscoverable",
      "privacyShowActivity",
      "privacyAnalytics",
    ] as const;

    for (const key of allowedKeys) {
      if (input[key] !== undefined) {
        patch[key] = input[key] as never;
      }
    }

    const [row] = await db
      .update(userSettings)
      .set(patch)
      .where(eq(userSettings.userId, profile.id))
      .returning();

    if (!row) return { ok: false, error: "Could not save your settings." };

    revalidatePath("/settings");
    revalidatePath("/calendar");
    revalidatePath("/notes");
    revalidatePath("/tasks");
    revalidatePath("/", "layout");

    return { ok: true, data: toUserSettings(row) };
  } catch (error) {
    return fail(error);
  }
}