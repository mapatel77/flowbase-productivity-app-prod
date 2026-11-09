import { REFINE_MODE_LABELS, REFINE_TONE_LABELS } from "@/lib/notes/constants";
import type { RefineMode, RefineTone } from "@/lib/notes/types";

/**
 * Gemini is called through its REST API so the app does not need an extra SDK.
 * The key never leaves the server because this module is only imported by a
 * server action.
 */

const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 25_000;

export const AI_REFINE_NOT_CONFIGURED_MESSAGE =
  "AI Refine is not configured yet. Add GEMINI_API_KEY to your environment and restart the app.";

export class AiRefineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiRefineError";
  }
}

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
    "You are a precise writing assistant inside a cozy notes app.",
    "Return only the revised text. Do not add a preamble, explanation, title, quotes,",
    "markdown fences, or commentary. Preserve the original meaning and language.",
  ].join(" ");
}

function instructionFor(mode: RefineMode, tone: RefineTone) {
  switch (mode) {
    case "grammar":
      return "Correct grammar, spelling and punctuation. Change as little of the wording as possible.";
    case "rephrase":
      return "Rewrite the text to improve clarity and flow while keeping the same meaning and roughly the same length.";
    case "shorter":
      return "Make the text more concise. Keep every important idea, but remove repetition and filler.";
    case "longer":
      return "Expand the text with relevant detail and smoother transitions, keeping the original voice.";
    case "simplify":
      return "Rewrite the text in plain, simple, everyday language while keeping the meaning intact.";
    case "tone":
      return `Rewrite the text in a ${REFINE_TONE_LABELS[tone].toLowerCase()} tone while preserving its meaning.`;
  }
}

function cleanRefinedText(value: string) {
  let text = value.trim();

  // Models occasionally wrap their answer in a code fence despite the prompt.
  const fenced = text.match(/^```(?:text|markdown)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) text = fenced[1].trim();

  if (text.length >= 2) {
    const first = text[0];
    const last = text[text.length - 1];
    if (
      (first === '"' && last === '"') ||
      (first === "'" && last === "'") ||
      (first === "“" && last === "”")
    ) {
      text = text.slice(1, -1).trim();
    }
  }

  return text;
}

export async function refineTextWithGemini(input: {
  text: string;
  mode: RefineMode;
  tone: RefineTone;
}): Promise<string> {
  const key = apiKey();
  if (!key) {
    throw new AiRefineError(AI_REFINE_NOT_CONFIGURED_MESSAGE);
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const baseUrl = (
    process.env.GEMINI_API_BASE_URL?.trim() || DEFAULT_BASE_URL
  ).replace(/\/$/, "");
  const endpoint = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const prompt = [
    instructionFor(input.mode, input.tone),
    "",
    "Selected text:",
    "<<<",
    input.text,
    ">>>",
  ].join("\n");

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt() }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: input.mode === "grammar" ? 0.2 : 0.55,
          topP: 0.95,
          maxOutputTokens: 1600,
          responseMimeType: "text/plain",
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("Gemini request failed", error);
    throw new AiRefineError(
      "AI Refine could not reach Gemini. Check your connection and try again.",
    );
  }

  const payload = (await response.json().catch(() => null)) as GeminiResponse | null;

  if (!response.ok) {
    const detail = payload?.error?.message;
    console.error("Gemini returned an error", response.status, detail);
    if (response.status === 400 || response.status === 403) {
      throw new AiRefineError(
        "Gemini rejected the request. Check that GEMINI_API_KEY is valid.",
      );
    }
    if (response.status === 429) {
      throw new AiRefineError(
        "AI Refine is busy right now. Wait a moment and try again.",
      );
    }
    throw new AiRefineError("Gemini could not refine that text. Try again.");
  }

  if (payload?.promptFeedback?.blockReason) {
    throw new AiRefineError(
      "Gemini declined to refine this selection. Try different text.",
    );
  }

  const text = payload?.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new AiRefineError("Gemini returned an empty result. Try again.");
  }

  return cleanRefinedText(text);
}

export function refineModeLabel(mode: RefineMode) {
  return REFINE_MODE_LABELS[mode];
}
