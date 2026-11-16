"use client";

import { Loader2, Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AssemblyAIStreamingStatus } from "@/hooks/use-assemblyai-streaming";
import { cn } from "@/lib/utils";

type VoiceButtonProps = {
  status: AssemblyAIStreamingStatus;
  isRecording: boolean;
  /** Called when the button is pressed. */
  onToggle: () => void;
  /** Label shown while idle, e.g. “Voice” or “Speak to Note”. */
  label: string;
  className?: string;
};

/**
 * The pill button that starts and stops live speech-to-text.
 *
 * It is shared by the note and page editors so both speak the same way; only
 * the idle label differs.
 */
export function VoiceButton({
  status,
  isRecording,
  onToggle,
  label,
  className,
}: VoiceButtonProps) {
  const connecting = status === "connecting";
  const stopping = status === "stopping";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      disabled={stopping}
      aria-label={
        isRecording
          ? "Stop recording"
          : connecting
            ? "Cancel connecting"
            : label
      }
      aria-pressed={isRecording}
      title={
        isRecording
          ? "Stop recording"
          : connecting
            ? "Cancel connecting"
            : label
      }
      className={cn(
        "h-7 gap-1.5 rounded-full border px-2 text-[11px] font-medium",
        isRecording
          ? "border-rose-500/40 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 dark:text-rose-300"
          : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
        connecting &&
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        className,
      )}
    >
      {connecting || stopping ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : isRecording ? (
        <span className="relative flex size-3.5 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-500/40" />
          <Mic className="relative size-3.5 animate-pulse" />
        </span>
      ) : (
        <Mic className="size-3.5" />
      )}
      <span className="hidden md:inline">
        {connecting
          ? "Cancel"
          : stopping
            ? "Finishing…"
            : isRecording
              ? "Stop"
              : label}
      </span>
    </Button>
  );
}
