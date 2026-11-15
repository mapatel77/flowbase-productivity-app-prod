import type { ColorToken } from "@/lib/calendar/colors";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

export const WHITEBOARD_NAME_MAX_LENGTH = 80;

export const WHITEBOARD_SCENE_MAX_BYTES = 8_000_000;

export const WHITEBOARD_SCENE_MAX_ELEMENTS = 500;

export type WhiteboardFileData = {
  id: string;
  mimeType: string;
  dataURL: string;
  created: number;
};

/**
 * The Excalidraw scene persisted per whiteboard. `files` keeps uploaded image
 * payloads (Excalidraw `FileId -> BinaryFileData`) so drawings survive reloads.
 */
export type WhiteboardScene = {
  elements: readonly ExcalidrawElement[];
  appState?: Record<string, unknown> | null;
  files?: Record<string, WhiteboardFileData>;
};

/** A single whiteboard in the workspace list. */
export type Whiteboard = {
  id: number;
  userId: number;
  name: string;
  color: ColorToken;
  scene?: WhiteboardScene | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WhiteboardSaveResult = {
  updatedAt: Date;
};

export type WhiteboardSaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "unsaved"
  | "error";

export type {
  AiDiagramEdge,
  AiDiagramKind,
  AiDiagramNode,
  AiDiagramShape,
  AiDiagramSpec,
} from "@/lib/whiteboard/constants";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
