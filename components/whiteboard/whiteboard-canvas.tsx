import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement,
  Theme,
} from "@excalidraw/excalidraw/element/types";
import { createStickyNote } from "@/lib/whiteboard/diagram";
import { STICKY_NOTE_COLORS } from "@/lib/whiteboard/constants";
import { exportWhiteboardPng } from "@/lib/whiteboard/export";
import type { WhiteboardScene } from "@/lib/whiteboard/types";

import "@excalidraw/excalidraw/index.css";

const ExcalidrawCanvas = dynamic(
  () => import("@excalidraw/excalidraw").then((module) => ({ default: module.Excalidraw })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#fbfaf7]">
        <span className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    ),
  },
);

export type WhiteboardCanvasHandle = {
  getElements: () => readonly ExcalidrawElement[];
  getAppState: () => AppState;
  getFiles: () => BinaryFiles;
  updateElements: (elements: readonly ExcalidrawElement[]) => void;
  addStickyNote: (colorKey: string) => void;
  applyColors: (colors: { stroke?: string; background?: string; text?: string }) => void;
  scrollToContent: (elements?: readonly ExcalidrawElement[]) => void;
  exportPng: () => Promise<Blob | null>;
};

export type WhiteboardCanvasProps = {
  scene: WhiteboardScene;
  name: string;
  onChange: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => void;
};

export const WhiteboardCanvas = forwardRef<
  WhiteboardCanvasHandle,
  WhiteboardCanvasProps
>(function WhiteboardCanvas({ scene, name, onChange }, ref) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(
    ref,
    () => ({
      getElements: () => apiRef.current?.getSceneElements() ?? [],
      getAppState: () => apiRef.current?.getAppState() ?? ({} as AppState),
      getFiles: () => apiRef.current?.getFiles() ?? ({} as BinaryFiles),
      updateElements: (elements: readonly ExcalidrawElement[]) => {
        apiRef.current?.updateScene({ elements });
      },
      addStickyNote: (colorKey: string) => {
        const api = apiRef.current;
        if (!api) return;

        const appState = api.getAppState();
        const zoom = Number(appState.zoom?.value ?? 1);
        const width = Number(appState.width ?? 1024);
        const height = Number(appState.height ?? 768);
        const sceneX = (Number(appState.scrollX ?? 0) + width / 2) / zoom;
        const sceneY = (Number(appState.scrollY ?? 0) + height / 2) / zoom;

        const sticky = STICKY_NOTE_COLORS.find((entry) => entry.key === colorKey) ?? STICKY_NOTE_COLORS[0];

        const elements = createStickyNote({
          id: `sticky-${Math.floor(Math.random() * 1e9)}`,
          x: sceneX - 110,
          y: sceneY - 80,
          width: 220,
          height: 160,
          backgroundColor: sticky.background,
          textColor: sticky.text,
          text: "Sticky note",
        });

        api.updateScene({
          elements: [...api.getSceneElements(), ...elements],
        });
      },
      applyColors: (colors: { stroke?: string; background?: string; text?: string }) => {
        const api = apiRef.current;
        if (!api) return;

        const appState = api.getAppState();
        const selectedElementIds = appState.selectedElementIds ?? {};

        const hasSelection = Object.keys(selectedElementIds ?? {}).length > 0;
        if (!hasSelection) {
          if (colors.stroke) {
            api.updateScene<"currentItemStrokeColor">({
              appState: { currentItemStrokeColor: colors.stroke },
            });
          }
          if (colors.background) {
            api.updateScene<"currentItemBackgroundColor">({
              appState: { currentItemBackgroundColor: colors.background },
            });
          }
          return;
        }

        const selectedElements = api
          .getSceneElements()
          .filter((element) => selectedElementIds[element.id]);

        const nextElements = selectedElements.map((element) => {
          const copy = {
            ...element,
          } as unknown as ExcalidrawElement & {
            backgroundColor: string;
            strokeColor: string;
          };
          const isSticky =
            (copy.customData as Record<string, unknown> | undefined)?.kind === "sticky";

          if (colors.background && isSticky) {
            copy.backgroundColor = colors.background;
          }
          if (colors.stroke) {
            copy.strokeColor = colors.stroke;
          }
          if (colors.text) {
            copy.strokeColor = colors.text;
          }

          return copy;
        });

        if (nextElements.length > 0) {
          api.updateScene({ elements: nextElements });
        }
      },
      scrollToContent: (elements?: readonly ExcalidrawElement[]) => {
        const api = apiRef.current;
        if (!api) return;
        api.scrollToContent(elements ?? api.getSceneElements());
      },
      exportPng: async () => {
        const api = apiRef.current;
        if (!api) return null;

        const elements = api.getSceneElements();
        const appState = api.getAppState();
        const files = api.getFiles();

        return exportWhiteboardPng({
          elements,
          appState,
          files,
          theme: "light",
        });
      },
    }),
    [],
  );

  const initialData = useMemo<ExcalidrawInitialDataState | null>(() => {
    const elements = scene.elements ?? [];
    const appState = (scene.appState ?? {}) as Record<string, unknown>;

    // Excalidraw expects linear-element points as [x, y] tuples. Scenes saved
    // by older code could contain {x, y} object points; restore turns those
    // into NaN geometry, so convert them defensively here.
    const normalizedElements = elements.map((element) => {
      const points = (element as { points?: unknown[] }).points;
      if (!Array.isArray(points)) return element;

      const converted = points.map((point) => {
        if (Array.isArray(point)) return point;
        if (
          point &&
          typeof point === "object" &&
          typeof (point as { x?: unknown }).x === "number" &&
          typeof (point as { y?: unknown }).y === "number"
        ) {
          return [(point as { x: number }).x, (point as { y: number }).y];
        }
        return point;
      });

      return { ...element, points: converted } as ExcalidrawElement;
    });

    return {
      elements: normalizedElements,
      appState: {
        ...appState,
        openSidebar: null,
        showWelcomeScreen: elements.length === 0,
      },
    } as ExcalidrawInitialDataState;
  }, [scene]);

  const handleChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      onChangeRef.current(elements, appState, files);
    },
    [],
  );

  return (
    <div className="relative h-full w-full min-h-0 overflow-hidden bg-[#fbfaf7]">
      <ExcalidrawCanvas
        theme={"light" as Theme}
        name={name}
        initialData={initialData}
        onChange={handleChange}
        excalidrawAPI={(api) => {
          apiRef.current = api;
        }}
      />
    </div>
  );
});

export default WhiteboardCanvas;
export type { ExcalidrawElement, Theme };
