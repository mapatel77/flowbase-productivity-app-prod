/**
 * Generates a structured template-app config from a user prompt using Gemini.
 * Mirrors the pattern in `lib/notes/ai.ts`: the API key never leaves the
 * server because this module is only imported by server actions.
 */

export class TemplateAppAiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateAppAiError";
  }
}

const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 120_000;

import type { TemplateAppConfig } from "./types";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
  };
};

function apiKey() {
  return (
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    ""
  );
}

function systemPrompt() {
  return [
    "You are a creative app-designer inside Flowbase, a cozy productivity studio.",
    "The user will describe a single-page mini app/template they want built. Return ONLY valid JSON matching this schema:",
    "{",
    '  "appName": "string",',
    '  "description": "string",',
    '  "icon": "string",        // a Lucide icon name, e.g. Flame, Layout, Checklist, TrendingUp, PiggyBank, BookOpen',
    '  "color": "string",       // one of: sky, emerald, amber, indigo, rose, violet, teal, orange',
    '  "layout": "single-page",',
    '  "sections": [',
    '    {',
    '      "id": "string",',
    '      "title": "string",',
    '      "type": "stats | list | table | form | progress | checklist | buttons | tags | chart",',
    '      "components": [{ "kind": "string", "props": {} }],',
    '      "fields": [{ "name": "string", "label": "string", "type": "text | number | date | checkbox | select", "required": boolean, "options": ["string"] }],',
    '      "data": {}',
    '    }',
    "  ],",
    '  "actions": [{ "label": "string", "kind": "save | add | delete | navigate", "href": "string" }],',
    '  "sampleData": {}',
    "}",
    "",
    "Supported section types:",
    "- stats: small metric cards (title, value, delta)",
    "- list: ordered items",
    "- table: rows + columns of data",
    "- form: labeled input fields",
    "- progress: progress bars with labels",
    "- checklist: tickable items",
    "- buttons: primary actions",
    "- tags: labeled badges",
    "- chart: a chart placeholder with kind and data",
    "",
    "Be specific to the user's prompt. Invent realistic sample data for each section.",
    "Return only the JSON. No markdown fences, no preamble, no explanation.",
  ].join("\n");
}

function cleanJsonText(value: string) {
  let text = value.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) text = fenced[1].trim();
  return text;
}

function resolveColorToken(color: string | undefined): string {
  const tokens = [
    "sky",
    "emerald",
    "amber",
    "indigo",
    "rose",
    "violet",
    "teal",
    "orange",
  ];
  if (color && tokens.includes(color)) return color;
  return "sky";
}

function resolveIconName(icon: string | undefined): string {
  if (!icon) return "Layout";
  const safe = icon.replace(/[^A-Za-z0-9]/g, "");
  return safe || "Layout";
}

export async function generateTemplateApp(
  prompt: string,
  options: {
    model?: string;
    customInstructions?: string;
  } = {},
): Promise<TemplateAppConfig> {
  const key = apiKey();
  if (!key) {
    throw new TemplateAppAiError(
      "AI generation is not configured yet. Add GEMINI_API_KEY to your environment and restart the app.",
    );
  }

  const model =
    options.model?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const baseUrl = (
    process.env.GEMINI_API_BASE_URL?.trim() || DEFAULT_BASE_URL
  ).replace(/\/$/, "");
  const endpoint = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const fullPrompt = [
    systemPrompt(),
    "",
    "User prompt:",
    "<<<",
    prompt.trim(),
    ">>>",
  ].join("\n");

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: [
                systemPrompt(),
                options.customInstructions
                  ? `The user's standing preferences: ${options.customInstructions}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.55,
          topP: 0.95,
          maxOutputTokens: 4000,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("Template AI request failed", error);
    throw new TemplateAppAiError(
      "AI generation could not reach Gemini. Check your connection and try again.",
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | GeminiResponse
    | null;

  if (!response.ok) {
    const detail = payload?.error?.message;
    console.error("Gemini returned an error", response.status, detail);
    if (response.status === 400 || response.status === 403) {
      throw new TemplateAppAiError(
        "Gemini rejected the request. Check that GEMINI_API_KEY is valid.",
      );
    }
    if (response.status === 429) {
      throw new TemplateAppAiError(
        "AI generation is busy right now. Wait a moment and try again.",
      );
    }
    throw new TemplateAppAiError(
      "Gemini could not generate that template. Try again.",
    );
  }

  if (payload?.promptFeedback?.blockReason) {
    throw new TemplateAppAiError(
      "Gemini declined to generate this template. Try a different prompt.",
    );
  }

  const text = payload?.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new TemplateAppAiError("Gemini returned an empty result. Try again.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJsonText(text));
  } catch (error) {
    console.error("Template AI returned invalid JSON", error, text);
    throw new TemplateAppAiError(
      "Gemini returned a response that could not be parsed. Try again.",
    );
  }

  const config = parsed as Partial<TemplateAppConfig>;

  if (!config.appName || !config.description || !Array.isArray(config.sections)) {
    throw new TemplateAppAiError(
      "Gemini returned an incomplete template config. Try again.",
    );
  }

  return {
    appName: String(config.appName).slice(0, 60),
    description: String(config.description).slice(0, 200),
    icon: resolveIconName(config.icon),
    color: resolveColorToken(config.color),
    layout: "single-page",
    sections: config.sections.map((section) => ({
      id: section.id || crypto.randomUUID(),
      title: String(section.title || "Section"),
      type:
        section.type === "stats" ||
        section.type === "list" ||
        section.type === "table" ||
        section.type === "form" ||
        section.type === "progress" ||
        section.type === "checklist" ||
        section.type === "buttons" ||
        section.type === "tags" ||
        section.type === "chart"
          ? section.type
          : "list",
      components: Array.isArray(section.components)
        ? section.components.map((c) => ({
            kind: String(c.kind || "text"),
            props: c.props && typeof c.props === "object" ? c.props : {},
          }))
        : [],
      fields: Array.isArray(section.fields)
        ? section.fields.map((f) => ({
            name: String(f.name || "field"),
            label: String(f.label || f.name || "Field"),
            type: ["text", "number", "date", "checkbox", "select"].includes(
              f.type,
            )
              ? (f.type as
                  | "text"
                  | "number"
                  | "date"
                  | "checkbox"
                  | "select")
              : "text",
            required: !!f.required,
            options: Array.isArray(f.options)
              ? f.options.map(String)
              : undefined,
          }))
        : [],
      data: section.data,
    })),
    actions: Array.isArray(config.actions)
      ? config.actions.map((a) => ({
          label: String(a.label || "Action"),
          kind: ["save", "add", "delete", "navigate"].includes(a.kind)
            ? (a.kind as "save" | "add" | "delete" | "navigate")
            : "navigate",
          href: typeof a.href === "string" ? a.href : undefined,
        }))
      : [],
    sampleData: config.sampleData ?? null,
  };
}
