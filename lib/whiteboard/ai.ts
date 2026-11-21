import {
  AI_DIAGRAM_MAX_EDGES,
  AI_DIAGRAM_MAX_NODES,
} from "@/lib/whiteboard/constants";
import type {
  AiDiagramEdge,
  AiDiagramKind,
  AiDiagramNode,
  AiDiagramShape,
  AiDiagramSpec,
} from "@/lib/whiteboard/types";

/**
 * Gemini is called through its REST API so the whiteboard keeps using the same
 * provider + key handling as the Notes AI Refine flow. This module is only
 * imported from server actions, so the key never reaches the browser bundle.
 */

const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 30_000;

export const AI_DIAGRAM_NOT_CONFIGURED_MESSAGE =
  "AI Diagram generation is not configured yet. Add GEMINI_API_KEY to your environment and restart the app.";

export class AiDiagramError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiDiagramError";
  }
}

const KIND_LABELS: Record<AiDiagramKind, string> = {
  flowchart: "Flowchart",
  mindmap: "Mind map",
  architecture: "System architecture diagram",
  journey: "User journey diagram",
  process: "Process diagram",
};

function apiKey() {
  return (
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    ""
  );
}

function systemPrompt(kind: AiDiagramKind) {
  const kindInstructions = KIND_LABELS[kind];

  return [
    "You design diagrams for a product team whiteboard.",
    `Return the diagram as JSON for a ${kindInstructions} only. Do not add prose, markdown fences, or commentary outside the JSON object.`,
    "The JSON shape must be exactly:",
    '{"title": string, "nodes": [{"id": string, "label": string, "shape": "rectangle" | "diamond" | "ellipse", "group": string}], "edges": [{"from": string, "to": string, "label": string}]}',
    "Use short, human friendly labels (3-8 words). Keep the diagram between 2 and 16 nodes. Maximum 24 edges. Node ids must be lowercase snake_case unique strings. Edges must connect existing node ids and must not loop back to the same node.",
  ].join(" ");
}

function cleanJsonText(value: string) {  let text = value.trim();

  // 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) text = fenced[1].trim();

  // 2. Strip leading/trailing prose by finding the outermost { } pair
  //    that encompasses the actual JSON object.
  let firstBrace = text.indexOf("{");
  let lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    // No braces found — return as-is; JSON.parse will fail with our custom message.
    return text.trim();
  }
  // If there's content before the first brace or after the last brace, drop it.
  // But if the text looks like prose surrounding JSON (e.g., "Here is the diagram: {…}"),
  // we still want to keep the JSON part.
  text = text.slice(firstBrace, lastBrace + 1);

  // 3. Remove any stray trailing/leading whitespace or newlines inside the braces
  //    that might cause JSON.parse to fail (e.g., trailing commas, extra newlines).
  //    We'll let JSON.parse handle structural errors, but trim the outer edges.
  return text.trim();
}

/**
 * Closes any strings/brackets left open by a truncated Gemini response so the
 * prefix of the JSON becomes a valid (if shorter) object.
 */
function closeOpenStructure(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const ch of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      if (inString) escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      stack.pop();
    }
  }

  let out = text;
  while (stack.length > 0) {
    const open = stack.pop() ?? "";
    out += open === "{" ? "}" : "]";
  }
  return out;
}

/**
 * Tolerant parse: tries the text as-is, then — for responses Gemini cut off
 * mid-object (finishReason MAX_TOKENS) — trims back to earlier commas and
 * closes the open structure so the completed nodes/edges survive.
 */
function parseJsonLeniently(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // fall through to truncation repair
  }

  const commaPositions: number[] = [];
  for (let i = text.length - 1; i >= 0 && commaPositions.length < 16; i -= 1) {
    if (text[i] === ",") commaPositions.push(i);
  }

  for (const cut of commaPositions) {
    try {
      return JSON.parse(closeOpenStructure(text.slice(0, cut)));
    } catch {
      // try the next cut point
    }
  }

  return null;
}

function parseDiagramJson(text: string): AiDiagramSpec {
  const cleaned = cleanJsonText(text);
  const parsed = parseJsonLeniently(cleaned);

  if (parsed === null) {
    // Snippet of what came back so failures are diagnosable from the UI.
    const preview = cleaned.length > 200 ? `${cleaned.slice(0, 200)}...` : cleaned;
    throw new AiDiagramError(
      `The AI returned a diagram that could not be read. (Preview of AI output: "${preview}")`,
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AiDiagramError("The AI returned an unreadable diagram.");
  }

  const title = (parsed as { title?: string }).title ?? "Generated diagram";

  const rawNodes = (parsed as { nodes?: AiDiagramNode[] }).nodes ?? [];
  const rawEdges = (parsed as { edges?: AiDiagramEdge[] }).edges ?? [];

  const nodes: AiDiagramNode[] = [];
  const seenIds = new Set<string>();

  for (const rawNode of Array.isArray(rawNodes) ? rawNodes : []) {
    if (!rawNode || typeof rawNode !== "object") continue;

    const label = typeof rawNode.label === "string" ? rawNode.label.trim() : "";
    const id = typeof rawNode.id === "string" ? rawNode.id.trim() : "";

    // Skip malformed nodes rather than failing the whole diagram.
    if (!id || !label || id.length > 40 || label.length > 80 || seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);

    const shape: AiDiagramShape =
      rawNode.shape === "diamond" || rawNode.shape === "ellipse"
        ? rawNode.shape
        : "rectangle";

    nodes.push({ id, label, shape, group: rawNode.group });
  }

  if (nodes.length < 2) {
    const baseLabel = nodes.length === 1 ? nodes[0].label : "Step";
    nodes.push({
      id: `node-${Math.random().toString(36).slice(2, 9)}`,
      label: `${baseLabel} 2`,
      shape: "rectangle",
      group: undefined,
    });
  }

  if (nodes.length > AI_DIAGRAM_MAX_NODES) {
    throw new AiDiagramError(
      `The AI diagram had ${nodes.length} nodes. Diagrams need between 2 and ${AI_DIAGRAM_MAX_NODES} nodes.`,
    );
  }

  const edges: AiDiagramEdge[] = [];
  const seenPairs = new Set<string>();

  for (const rawEdge of Array.isArray(rawEdges) ? rawEdges : []) {
    if (!rawEdge || typeof rawEdge !== "object") continue;

    const from = rawEdge.from;
    const to = rawEdge.to;
    const label = rawEdge.label;

    // Skip invalid/unknown/self-loop connections rather than throwing.
    if (!from || !to || from === to || !seenIds.has(from) || !seenIds.has(to)) {
      continue;
    }

    const key = `${from}->${to}`;
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);

    edges.push({ from, to, label });
  }

  if (edges.length > AI_DIAGRAM_MAX_EDGES) {
    throw new AiDiagramError("The AI diagram was too dense to render.");
  }

  return { title, nodes, edges };
}

export async function generateDiagramWithGemini(input: {
  prompt: string;
  kind: AiDiagramKind;
  model?: string;
  customInstructions?: string;
}): Promise<AiDiagramSpec> {
  const key = apiKey();
  if (!key) {
    throw new AiDiagramError(AI_DIAGRAM_NOT_CONFIGURED_MESSAGE);
  }

  const model =
    input.model?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const baseUrl = (
    process.env.GEMINI_API_BASE_URL?.trim() || DEFAULT_BASE_URL
  ).replace(/\/$/, "");
  const endpoint = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: [
              systemPrompt(input.kind),
              input.customInstructions
                ? `The user's standing preferences: ${input.customInstructions}`
                : "",
            ]
              .filter(Boolean)
              .join(" "),
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: input.prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        // Pretty-printed JSON diagrams burn tokens fast on newlines/indent.
        // 1600 truncated mid-object and made the response unparseable.
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            nodes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  shape: { type: "string", enum: ["rectangle", "diamond", "ellipse"] },
                  group: { type: "string" },
                },
                required: ["id", "label"],
              },
            },
            edges: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: { type: "string" },
                  to: { type: "string" },
                  label: { type: "string" },
                },
                required: ["from", "to"],
              },
            },
          },
          required: ["title", "nodes", "edges"],
        },
      },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const payload = (await response.json().catch(() => null)) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    error?: { message?: string };
    promptFeedback?: { blockReason?: string };
  } | null;

  if (!response.ok) {
    const detail = payload?.error?.message;
    console.error("Gemini diagram request failed", response.status, detail);

    if (response.status === 400 || response.status === 403) {
      throw new AiDiagramError(
        "Gemini rejected the diagram request. Check that GEMINI_API_KEY is valid.",
      );
    }
    if (response.status === 429) {
      throw new AiDiagramError(
        "The AI diagram service is busy right now. Wait a moment and try again.",
      );
    }
    // Specific status-based messages
    throw new AiDiagramError(
      `Gemini API returned status ${response.status}. ${
        detail ? `Details: ${detail}` : "Check your GEMINI_API_KEY and quota."
      }`,
    );
  }

  if (payload?.promptFeedback?.blockReason) {
    throw new AiDiagramError(
      "Gemini declined to build that diagram. Try a different prompt.",
    );
  }

  const finishReason = payload?.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== "STOP") {
    console.warn(
      "Gemini diagram finishReason",
      finishReason,
      "- the response may have been truncated or unusual",
    );
  }

  const text = payload?.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new AiDiagramError("Gemini returned an empty diagram.");
  }

  try {
    return parseDiagramJson(text);
  } catch (error) {
    if (error instanceof AiDiagramError) throw error;
    throw new AiDiagramError("The AI returned a diagram that could not be read.");
  }
}
