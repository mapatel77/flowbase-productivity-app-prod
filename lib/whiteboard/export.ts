import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, Theme } from "@excalidraw/excalidraw/element/types";

export const WHITEBOARD_EXPORT_SCALE = 2;

export async function exportWhiteboardPng(params: {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
  theme: Theme;
  exportScale?: number;
}): Promise<Blob | null> {
  try {
    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const blob = await exportToBlob({
      elements: params.elements,
      appState: params.appState,
      files: params.files,
      format: "png",
      exportScale: params.exportScale ?? WHITEBOARD_EXPORT_SCALE,
    });

    if (!blob) return null;
    return blob;
  } catch (error) {
    console.error("Whiteboard PNG export failed", error);
    return null;
  }
}
