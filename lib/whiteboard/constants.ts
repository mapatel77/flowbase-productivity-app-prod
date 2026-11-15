import type { ColorToken } from "@/lib/calendar/colors";

/** Default colour for freshly created whiteboards. */
export const WHITEBOARD_DEFAULT_COLOR: ColorToken = "emerald";

/** Debounce before an in-progress whiteboard edit is persisted. */
export const WHITEBOARD_SAVE_DEBOUNCE_MS = 800;

/** How far the canvas is zoomed out when a fresh whiteboard is opened. */
export const WHITEBOARD_FALLBACK_ZOOM = 1;

/** Diagram generation limits shared by the prompt + validation layers. */
export const AI_DIAGRAM_MAX_NODES = 16;
export const AI_DIAGRAM_MAX_EDGES = 24;
export const AI_DIAGRAM_NODE_WIDTH = 200;
export const AI_DIAGRAM_NODE_HEIGHT = 72;
export const AI_DIAGRAM_FONT_SIZE = 18;
export const AI_DIAGRAM_EDGE_LABEL_FONT_SIZE = 14;

export const AI_DIAGRAM_KINDS = [
  "flowchart",
  "mindmap",
  "architecture",
  "journey",
  "process",
] as const;

export type AiDiagramKind = (typeof AI_DIAGRAM_KINDS)[number];

export type AiDiagramShape = "rectangle" | "diamond" | "ellipse";

export type AiDiagramNode = {
  id: string;
  label: string;
  shape?: AiDiagramShape;
  group?: string;
};

export type AiDiagramEdge = {
  from: string;
  to: string;
  label?: string;
};

export type AiDiagramSpec = {
  title: string;
  nodes: AiDiagramNode[];
  edges: AiDiagramEdge[];
};

export type StickyNoteColor = {
  key: string;
  label: string;
  background: string;
  text: string;
};

export const STICKY_NOTE_COLORS: StickyNoteColor[] = [
  { key: "honey", label: "Honey", background: "#ffd97d", text: "#5f3d0b" },
  { key: "peach", label: "Peach", background: "#ffcf9e", text: "#5f2f0b" },
  { key: "mint", label: "Mint", background: "#b8f1d4", text: "#0c3b26" },
  { key: "sky", label: "Sky", background: "#b3e0ff", text: "#0b2f4f" },
  { key: "lilac", label: "Lilac", background: "#e3c8ff", text: "#33155c" },
  { key: "blush", label: "Blush", background: "#ffc2d1", text: "#4d0f28" },
];
