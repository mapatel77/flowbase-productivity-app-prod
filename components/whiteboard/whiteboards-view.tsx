"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createWhiteboard,
  deleteWhiteboard,
  duplicateWhiteboard,
  generateAiDiagram,
  getWhiteboardScene,
  renameWhiteboard,
  saveWhiteboardScene,
} from "@/app/whiteboard/actions";
import { WhiteboardCanvas, type WhiteboardCanvasHandle } from "@/components/whiteboard/whiteboard-canvas";
import { WhiteboardDeleteDialog } from "@/components/whiteboard/whiteboard-delete-dialog";
import { WhiteboardDialog } from "@/components/whiteboard/whiteboard-dialog";
import { WhiteboardEmpty } from "@/components/whiteboard/whiteboard-empty";
import { WhiteboardSidebar } from "@/components/whiteboard/whiteboard-sidebar";
import { WhiteboardTopbar } from "@/components/whiteboard/whiteboard-topbar";
import { AiDiagramDialog } from "@/components/whiteboard/ai-diagram-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster, toast } from "@/components/ui/toast";
import { buildDiagramElements } from "@/lib/whiteboard/diagram";
import { WHITEBOARD_SAVE_DEBOUNCE_MS } from "@/lib/whiteboard/constants";
import type {
  AiDiagramKind,
  Whiteboard,
  WhiteboardSaveStatus,
  WhiteboardScene,
} from "@/lib/whiteboard/types";
import type { ColorToken } from "@/lib/calendar/colors";

type WhiteboardsViewProps = {
  initialWhiteboards: Whiteboard[];
};

const EMPTY_SCENE: WhiteboardScene = {
  elements: [],
  appState: { viewBackgroundColor: "#fbfaf7", gridSize: 20 },
  files: {},
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

export function WhiteboardsView({ initialWhiteboards }: WhiteboardsViewProps) {
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>(initialWhiteboards);
  const [activeId, setActiveId] = useState<number | null>(
    () => initialWhiteboards[0]?.id ?? null,
  );
  const [scene, setScene] = useState<WhiteboardScene | null>(null);
  const [saveStatus, setSaveStatus] = useState<WhiteboardSaveStatus>("idle");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Whiteboard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Whiteboard | null>(null);

  const canvasRef = useRef<WhiteboardCanvasHandle | null>(null);
  const sceneRef = useRef<WhiteboardScene | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<number | null>(null);
  const skipNextSaveRef = useRef(false);

  const activeBoard = useMemo(
    () => whiteboards.find((board) => board.id === activeId) ?? null,
    [whiteboards, activeId],
  );

  /* ── persistence ─────────────────────────────────────────────────────── */

  const flushSave = useCallback(async () => {
    const id = activeIdRef.current;
    const currentScene = sceneRef.current;
    if (id === null || !currentScene) return;

    setSaveStatus("saving");
    const result = await saveWhiteboardScene({ id, scene: currentScene });
    if (!result.ok) {
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saved");
    setWhiteboards((current) =>
      current.map((board) =>
        board.id === id ? { ...board, updatedAt: result.data.updatedAt } : board,
      ),
    );
  }, []);

  const scheduleSave = useCallback(
    (nextScene: WhiteboardScene) => {
      sceneRef.current = nextScene;
      setScene(nextScene);
      setSaveStatus((current) => (current === "error" ? current : "unsaved"));

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void flushSave();
      }, WHITEBOARD_SAVE_DEBOUNCE_MS);
    },
    [flushSave],
  );

  useEffect(() => {
    if (!activeId) {
      sceneRef.current = null;
      setScene(null);
      setSaveStatus("idle");
      return;
    }

    let cancelled = false;

    const load = async () => {
      const result = await getWhiteboardScene(activeId);
      if (cancelled) return;
      const nextScene = result.ok ? result.data : EMPTY_SCENE;
      sceneRef.current = nextScene;
      setScene(nextScene);
      setSaveStatus("idle");
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    if (!activeId || !scene) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    scheduleSave(scene);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [scene, activeId, scheduleSave]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  /* ── whiteboard actions ──────────────────────────────────────────────── */

  const handleCreate = async () => {
    if (busy) return;

    setBusy(true);
    try {
      const result = await createWhiteboard();
      if (!result.ok) {
        toast.add({
          title: "Could not create the whiteboard",
          description: result.error,
          type: "error",
        });
        return;
      }

      setWhiteboards((current) => [result.data, ...current]);
      activeIdRef.current = result.data.id;
      setActiveId(result.data.id);
      sceneRef.current = EMPTY_SCENE;
      setScene(EMPTY_SCENE);
      setSaveStatus("idle");
      skipNextSaveRef.current = true;

      setRenameTarget(result.data);
      toast.add({ title: "Whiteboard created", description: result.data.name });
    } finally {
      setBusy(false);
    }
  };

  const handleSelect = async (id: number) => {
    if (id === activeIdRef.current) {
      setMobileOpen(false);
      return;
    }

    await flushSave();
    skipNextSaveRef.current = true;
    activeIdRef.current = id;
    setActiveId(id);

    const result = await getWhiteboardScene(id);
    const nextScene = result.ok ? result.data : EMPTY_SCENE;
    sceneRef.current = nextScene;
    setScene(nextScene);
    setSaveStatus("idle");
    setMobileOpen(false);
  };

  const handleDelete = async (board: Whiteboard) => {
    if (busy) return;

    setBusy(true);
    try {
      const result = await deleteWhiteboard(board.id);
      if (!result.ok) {
        toast.add({
          title: "Could not delete the whiteboard",
          description: result.error,
          type: "error",
        });
        return;
      }

      const remaining = whiteboards.filter((item) => item.id !== board.id);
      setWhiteboards(remaining);

      if (activeIdRef.current === board.id) {
        const nextId = remaining[0]?.id ?? null;
        activeIdRef.current = nextId;
        setActiveId(nextId);
        if (nextId === null) {
          sceneRef.current = EMPTY_SCENE;
          setScene(EMPTY_SCENE);
          setSaveStatus("idle");
        } else {
          const nextResult = await getWhiteboardScene(nextId);
          const nextScene = nextResult.ok ? nextResult.data : EMPTY_SCENE;
          sceneRef.current = nextScene;
          setScene(nextScene);
          setSaveStatus("idle");
        }
      }

      toast.add({ title: "Whiteboard deleted", description: board.name });
    } finally {
      setBusy(false);
    }
  };

  const handleRenameSubmit = useCallback(
    async (values: { name: string; color: ColorToken }) => {
      const board = renameTarget;
      if (!board) return false;

      const result = await renameWhiteboard({
        id: board.id,
        name: values.name,
        color: values.color,
      });

      if (!result.ok) {
        toast.add({
          title: "Could not rename the whiteboard",
          description: result.error,
          type: "error",
        });
        return false;
      }

      setWhiteboards((current) =>
        current.map((item) => (item.id === result.data.id ? result.data : item)),
      );
      return true;
    },
    [renameTarget],
  );

  const handleDuplicate = async (board: Whiteboard) => {
    const result = await duplicateWhiteboard(board.id);
    if (!result.ok) {
      toast.add({
        title: "Could not duplicate the whiteboard",
        description: result.error,
        type: "error",
      });
      return;
    }

    setWhiteboards((current) => [...current, result.data]);
    activeIdRef.current = result.data.id;
    setActiveId(result.data.id);
    sceneRef.current = result.data.scene ?? EMPTY_SCENE;
    setScene(result.data.scene ?? EMPTY_SCENE);
    setSaveStatus("idle");

    toast.add({ title: "Whiteboard duplicated", description: result.data.name });
  };

  const handleClear = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.updateElements([]);
    const emptyScene: WhiteboardScene = {
      elements: [],
      appState: { viewBackgroundColor: "#fbfaf7", gridSize: 20 },
      files: {},
    };
    sceneRef.current = emptyScene;
    setScene(emptyScene);
    await flushSave();
  };

  /* ── AI diagram ──────────────────────────────────────────────────────── */

  const handleGenerate = async (input: { prompt: string; kind: AiDiagramKind }) => {
    const id = activeId;  // FIX: use the React state directly instead of activeIdRef.current
    const canvas = canvasRef.current;
    if (id === null || !canvas) return false;

    setAiBusy(true);
    try {
      const spec = await generateAiDiagram(input);
      const additions = buildDiagramElements(spec, input.kind, {
        offsetX: 60,
        offsetY: 60,
      });

      // updateScene replaces the whole scene, so always pass the merged list.
      const merged = [...canvas.getElements(), ...additions];
      canvas.updateElements(merged);
      canvas.scrollToContent(merged);

      await saveWhiteboardScene({
        id,
        scene: {
          elements: merged,
          appState: { viewBackgroundColor: "#fbfaf7", gridSize: 20 },
          files: {},
        },
      });

      toast.add({ title: "AI diagram added", description: spec.title });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The AI diagram could not be generated.";
      toast.add({ title: "AI diagram failed", description: message, type: "error" });
      return false;
    } finally {
      setAiBusy(false);
    }
  };

  /* ── export ──────────────────────────────────────────────────────────── */

  const handleExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setExporting(true);
    try {
      const blob = await canvas.exportPng();
      if (!blob) {
        toast.add({
          title: "Export failed",
          description: "The whiteboard could not be rendered as PNG.",
          type: "error",
        });
        return;
      }

      const safeName =
        (activeBoard?.name ?? "whiteboard")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "whiteboard";
      downloadBlob(blob, `${safeName}.png`);
      toast.add({ title: "Whiteboard exported", description: `${safeName}.png was downloaded.` });
    } finally {
      setExporting(false);
    }
  };

  /* ── render ──────────────────────────────────────────────────────────── */

  const sidebar = (
    <WhiteboardSidebar
      whiteboards={whiteboards}
      activeId={activeId}
      onSelect={(id) => void handleSelect(id)}
      onCreate={() => void handleCreate()}
      onRename={setRenameTarget}
      onDelete={(board) => setDeleteTarget(board)}
    />
  );

  return (
    <>
      <div className="flex h-[calc(100svh-6.5rem)] min-h-[32rem] overflow-hidden md:h-[calc(100svh-7.5rem)]">
        <div className="hidden w-72 shrink-0 border-r border-border/60 lg:block xl:w-80">
          {sidebar}
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <WhiteboardTopbar
            name={activeBoard?.name ?? "Whiteboard"}
            saveStatus={saveStatus}
            exporting={exporting}
            onOpenAi={() => setAiOpen(true)}
            onExport={() => void handleExport()}
            onAddSticky={(colorKey) => canvasRef.current?.addStickyNote(colorKey)}
            onOpenRename={() => {
              if (activeBoard) setRenameTarget(activeBoard);
            }}
            onOpenDelete={() => {
              if (activeBoard) setDeleteTarget(activeBoard);
            }}
            onDuplicate={() => activeBoard && void handleDuplicate(activeBoard)}
            onApplyStroke={(color) => canvasRef.current?.applyColors({ stroke: color })}
            onApplyBackground={(color) => canvasRef.current?.applyColors({ background: color })}
            onApplyText={(color) => canvasRef.current?.applyColors({ text: color })}
            onClear={() => void handleClear()}
            onOpenMobileList={() => setMobileOpen(true)}
          />

          <div className="relative min-h-0 flex-1 overflow-hidden">
            {activeId ? (
              <WhiteboardCanvas
                key={activeId}
                ref={canvasRef}
                scene={scene ?? EMPTY_SCENE}
                name={activeBoard?.name ?? "Whiteboard"}
                onChange={(elements, appState, files) => {
                  const nextScene: WhiteboardScene = {
                    elements,
                    appState:
                      (appState as unknown as WhiteboardScene["appState"]) ??
                      sceneRef.current?.appState ??
                      null,
                    files: (files as WhiteboardScene["files"]) ?? {},
                  };
                  sceneRef.current = nextScene;
                  setScene(nextScene);
                }}
              />
            ) : (
              <WhiteboardEmpty busy={busy} onCreate={() => void handleCreate()} />
            )}
          </div>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[88vw] max-w-sm gap-0 bg-background p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Whiteboards</SheetTitle>
            <SheetDescription>Choose a whiteboard or create a new one.</SheetDescription>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>

      <AiDiagramDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        busy={aiBusy}
        onGenerate={(input) => handleGenerate(input)}
      />

      <WhiteboardDialog
        key={renameTarget?.id ?? "whiteboard-create"}
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        whiteboard={renameTarget}
        busy={busy}
        onSubmit={async (values) => {
          if (!renameTarget) return false;
          const saved = await handleRenameSubmit(values);
          if (saved) setRenameTarget(null);
          return saved;
        }}
      />

      <WhiteboardDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        busy={busy}
        whiteboard={deleteTarget}
        onConfirm={() => {
          if (deleteTarget) {
            return handleDelete(deleteTarget);
          }
          return Promise.resolve();
        }}
      />

      <Toaster />
    </>
  );
}
