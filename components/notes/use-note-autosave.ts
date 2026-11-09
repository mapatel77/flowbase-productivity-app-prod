"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { NOTE_SAVE_DEBOUNCE_MS } from "@/lib/notes/constants";
import type {
  ActionResult,
  NoteDocument,
  NoteSaveResult,
} from "@/lib/notes/types";

export type NoteSnapshot = {
  title: string;
  content: NoteDocument;
  plainText: string;
};

export type NoteSaveState = "saved" | "unsaved" | "saving" | "error";

type UseNoteAutosaveOptions = {
  initialUpdatedAt: Date;
  save: (snapshot: NoteSnapshot) => Promise<ActionResult<NoteSaveResult>>;
  onSaved?: (result: NoteSaveResult, snapshot: NoteSnapshot) => void;
  delay?: number;
};

/**
 * Debounced, serialized saving for the note editor.
 *
 * Only one save request can be in flight at a time. Changes made while a save
 * is running stay marked as dirty and are persisted by the same loop as soon as
 * the request finishes. New note switches remount the hook (the editor has a
 * key), so there is no cross-note snapshot to reconcile.
 */
export function useNoteAutosave({
  initialUpdatedAt,
  save,
  onSaved,
  delay = NOTE_SAVE_DEBOUNCE_MS,
}: UseNoteAutosaveOptions) {
  const [state, setState] = useState<NoteSaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState(initialUpdatedAt);
  const [error, setError] = useState<string | null>(null);

  const latestRef = useRef<NoteSnapshot | null>(null);
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(false);

  const saveRef = useRef(save);
  const onSavedRef = useRef(onSaved);
  saveRef.current = save;
  onSavedRef.current = onSaved;

  const performSave = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;

    const task = (async () => {
      while (dirtyRef.current && latestRef.current) {
        const snapshot = latestRef.current;
        dirtyRef.current = false;

        if (mountedRef.current) {
          setState("saving");
          setError(null);
        }

        const result = await saveRef.current(snapshot);

        if (!result.ok) {
          // Keep the snapshot dirty so the next keystroke (or tab hide) retries.
          if (latestRef.current === snapshot) dirtyRef.current = true;
          if (mountedRef.current) {
            setState("error");
            setError(result.error);
          }
          return;
        }

        onSavedRef.current?.(result.data, snapshot);

        if (mountedRef.current) {
          setLastSavedAt(result.data.updatedAt);
          setError(null);
        }
      }

      if (mountedRef.current) setState("saved");
    })();

    inFlightRef.current = task;
    try {
      await task;
    } finally {
      inFlightRef.current = null;
    }
  }, []);

  const markDirty = useCallback(
    (snapshot: NoteSnapshot) => {
      latestRef.current = snapshot;
      dirtyRef.current = true;

      if (mountedRef.current) {
        setState((previous) =>
          previous === "saving" ? previous : "unsaved",
        );
        setError(null);
      }

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void performSave();
      }, delay);
    },
    [delay, performSave],
  );

  const flush = useCallback(async () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!dirtyRef.current && !inFlightRef.current) return;
    await performSave();
  }, [performSave]);

  // Fire-and-forget persistence when the editor is replaced or unmounted.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void performSave();
    };
  }, [performSave]);

  // Catch tab closes / phones locking before the debounce has elapsed.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") void performSave();
    };
    const handlePageHide = () => {
      void performSave();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [performSave]);

  return {
    markDirty,
    flush,
    state,
    lastSavedAt,
    error,
  };
}
