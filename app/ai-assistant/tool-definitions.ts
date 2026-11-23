import { z } from "zod";

/**
 * Tool catalogue shared by the text chat (Gemini) and the AssemblyAI Voice
 * Agent. It lives outside `actions.ts` because a `"use server"` module may only
 * export async functions, and the Voice Agent session configuration needs
 * plain constants.
 */
export type AiToolDefinition = {
  name: string;
  description: string;
  parameters: z.ZodSchema;
};

export const TOOL_DEFINITIONS: AiToolDefinition[] = [
  {
    name: "create_kanban_board",
    description: "Create a new Kanban board with default columns",
    parameters: z.object({
      name: z.string().min(1).max(60),
      color: z.string().optional(),
    }),
  },
  {
    name: "list_kanban_boards",
    description:
      "List the Kanban boards the user can access, including each board's columns and their IDs. Call this before creating a task so you know the correct boardId and columnId.",
    parameters: z.object({}),
  },
  {
    name: "create_kanban_task",
    description: "Create a new task on a Kanban board",
    parameters: z.object({
      boardId: z.number(),
      columnId: z.number(),
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      labels: z
        .array(
          z.object({
            name: z.string(),
            color: z.string(),
          }),
        )
        .optional(),
      syncCalendar: z.boolean().optional(),
    }),
  },
  {
    name: "create_calendar_entry",
    description: "Create a new calendar entry (task or reminder)",
    parameters: z.object({
      title: z.string().min(1).max(200),
      notes: z.string().optional(),
      kind: z.enum(["task", "reminder"]).optional(),
      categoryId: z.number().optional(),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
    }),
  },
  {
    name: "create_note",
    description: "Create a new note",
    parameters: z.object({
      title: z.string().min(1).max(80).optional(),
      color: z.string().optional(),
      content: z.unknown().optional(),
    }),
  },
  {
    name: "generate_template_app",
    description: "Generate a template app from a prompt",
    parameters: z.object({
      prompt: z.string().min(1).max(2000),
    }),
  },
  {
    name: "update_user_settings",
    description: "Update user settings",
    parameters: z.object({
      aiModel: z.string().optional(),
      aiDefaultMode: z.string().optional(),
      aiTone: z.string().optional(),
      aiCustomInstructions: z.string().optional(),
      theme: z.string().optional(),
      calendarDefaultView: z.string().optional(),
      defaultTaskPriority: z.string().optional(),
      aiRefineEnabled: z.boolean().optional(),
      aiAssistantEnabled: z.boolean().optional(),
      aiTemplateBuilderEnabled: z.boolean().optional(),
      aiDiagramEnabled: z.boolean().optional(),
      autoSaveEnabled: z.boolean().optional(),
      notifyTaskReminders: z.boolean().optional(),
      notifyDueDates: z.boolean().optional(),
      notifyWeeklyDigest: z.boolean().optional(),
      notifyProductUpdates: z.boolean().optional(),
      privacyProfileDiscoverable: z.boolean().optional(),
      privacyShowActivity: z.boolean().optional(),
      privacyAnalytics: z.boolean().optional(),
    }),
  },
];

/** Returns the JSON Schema parameter object for a tool. */
export function getFunctionParameters(name: string) {
  switch (name) {
    case "create_kanban_board":
      return {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the board" },
          color: { type: "string", description: "Board color (sky, emerald, amber, indigo, rose, violet, teal, orange)" },
        },
        required: ["name"],
      };
    case "list_kanban_boards":
      return {
        type: "object",
        properties: {},
        required: [],
      };
    case "create_kanban_task":
      return {
        type: "object",
        properties: {
          boardId: { type: "number", description: "ID of the Kanban board" },
          columnId: { type: "number", description: "ID of the column to add the task to" },
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          dueDate: { type: "string", description: "Due date in YYYY-MM-DD format" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          labels: {
            type: "array",
            items: { type: "object", properties: { name: { type: "string" }, color: { type: "string" } } },
          },
          syncCalendar: { type: "boolean" },
        },
        required: ["boardId", "columnId", "title"],
      };
    case "create_calendar_entry":
      return {
        type: "object",
        properties: {
          title: { type: "string", description: "Entry title" },
          notes: { type: "string", description: "Entry notes" },
          kind: { type: "string", enum: ["task", "reminder"] },
          categoryId: { type: "number" },
          scheduledDate: { type: "string", description: "Date in YYYY-MM-DD format" },
          scheduledTime: { type: "string", description: "Time in HH:MM format" },
        },
        required: ["title"],
      };
    case "create_note":
      return {
        type: "object",
        properties: {
          title: { type: "string", description: "Note title" },
          color: { type: "string", description: "Note color" },
          content: { type: "object", description: "Note content (Tiptap JSON)" },
        },
        required: [],
      };
    case "generate_template_app":
      return {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Prompt to generate the template app" },
        },
        required: ["prompt"],
      };
    case "update_user_settings":
      return {
        type: "object",
        properties: {
          aiModel: { type: "string" },
          aiDefaultMode: { type: "string" },
          aiTone: { type: "string" },
          aiCustomInstructions: { type: "string" },
          theme: { type: "string" },
          calendarDefaultView: { type: "string" },
          defaultTaskPriority: { type: "string" },
          aiRefineEnabled: { type: "boolean" },
          aiAssistantEnabled: { type: "boolean" },
          aiTemplateBuilderEnabled: { type: "boolean" },
          aiDiagramEnabled: { type: "boolean" },
          autoSaveEnabled: { type: "boolean" },
          notifyTaskReminders: { type: "boolean" },
          notifyDueDates: { type: "boolean" },
          notifyWeeklyDigest: { type: "boolean" },
          notifyProductUpdates: { type: "boolean" },
          privacyProfileDiscoverable: { type: "boolean" },
          privacyShowActivity: { type: "boolean" },
          privacyAnalytics: { type: "boolean" },
        },
        required: [],
      };
    default:
      return { type: "object", properties: {}, required: [] };
  }
}

/**
 * System prompt used by the AssemblyAI Voice Agent session.
 *
 * Voice answers are spoken out loud, so the prompt pushes for short, plain
 * sentences, forbids markdown/emoji that would be read back awkwardly, and
 * reuses the same tool-calling rules as the text chat.
 */
export const VOICE_AGENT_SYSTEM_PROMPT = [
  "You are Flowbase AI, a helpful productivity assistant inside the Flowbase app.",
  "You are speaking with the user out loud, so keep every reply to one or two short sentences.",
  "Never use markdown, bullet lists, emoji, code blocks, or special formatting — everything you say is read aloud.",
  "Spell out dates and times in a natural way, for example 'tomorrow at 3 PM'.",
  "If a request is unclear, ask one short clarifying question before acting.",
  "For important actions (deleting or modifying existing data), confirm with the user first.",
  "When you complete an action, say so plainly in one sentence.",
  "",
  "Tools you can use:",
  ...TOOL_DEFINITIONS.map((tool) => `- ${tool.name}: ${tool.description}`),
].join("\n");

export type VoiceAgentToolDefinition = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

/**
 * Tool definitions in the AssemblyAI Voice Agent API shape. These are
 * client-side function tools: the browser receives a `tool.call`, runs the
 * matching server action, and replies with a `tool.result`.
 */
export const VOICE_AGENT_TOOLS: VoiceAgentToolDefinition[] = TOOL_DEFINITIONS.map(
  (tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: getFunctionParameters(tool.name),
  }),
);
