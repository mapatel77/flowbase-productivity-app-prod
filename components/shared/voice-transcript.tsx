"use client";

import { Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AssemblyAIStreamingStatus } from "@/hooks/use-assemblyai-streaming";
import { cn } from "@/lib/utils";

type VoiceTranscriptProps = {
  status: AssemblyAIStreamingStatus;
  /** The live, not-yet-finalised transcript. */
  partialTranscript: string;
  /** Hint shown when nothing has been said yet. */
  placeholder: string;
  /** Called when the reader presses the stop button. */
  onStop?: () => void;
};

/** The live transcript panel shown while the microphone is recording. */
export function VoiceTranscript({
  status,
  partialTranscript,
  placeholder,
  onStop,
}: VoiceTranscriptProps) {
  const recording = status === "recording";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-2 md:px-8">
      <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-1.5 text-xs">
        <span
          className="relative flex size-2 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <span
            className={cn(
              "absolute inline-flex size-2 rounded-full",
              recording ? "animate-ping bg-rose-500/50" : "bg-amber-500/40",
            )}
          />
          <span
            className={cn(
              "relative size-1.5 rounded-full",
              recording ? "bg-rose-500" : "bg-amber-500",
            )}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground/80" aria-live="polite">
            {status === "connecting"
              ? "Connecting to AssemblyAI…"
              : status === "stopping"
                ? "Finishing last words…"
                : "Listening…"}
          </p>
          <p className="truncate text-muted-foreground" aria-live="off">
            {partialTranscript ||
              (status === "connecting"
                ? "Allow microphone access if your browser asks."
                : status === "stopping"
                  ? "Saving the last finalized phrase…"
                  : placeholder)}
          </p>
        </div>

        {recording && onStop ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onStop}
            aria-label="Stop recording"
            className="shrink-0 gap-1 rounded-full text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
          >
            <Square className="size-2.5 fill-current" />
            Stop
          </Button>
        ) : null}
      </div>
    </div>
  );
}
