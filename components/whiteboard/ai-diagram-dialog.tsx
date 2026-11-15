"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AI_DIAGRAM_KINDS, type AiDiagramKind } from "@/lib/whiteboard/constants";

type AiDiagramDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onGenerate: (input: { prompt: string; kind: AiDiagramKind }) => Promise<boolean>;
};

const KIND_OPTIONS: Array<{ value: AiDiagramKind; label: string }> = [
  { value: "flowchart", label: "Flowchart" },
  { value: "mindmap", label: "Mind map" },
  { value: "architecture", label: "Architecture" },
  { value: "journey", label: "Journey" },
  { value: "process", label: "Process" },
];

const EXAMPLES: Record<AiDiagramKind, string[]> = {
  flowchart: [
    "Customer onboarding flow with email verification and trial upgrade",
    "Order fulfilment happy path and exception handling",
  ],
  mindmap: [
    "Product launch plan: research, design, engineering, marketing, launch",
  ],
  architecture: [
    "SaaS architecture: client, API, worker queue, Postgres, Redis, S3, analytics",
  ],
  journey: [
    "New user signs up, invites teammate, creates first board, runs AI diagram",
  ],
  process: [
    "Employee expense reimbursement from submit to approval to payout",
  ],
};

export function AiDiagramDialog({
  open,
  onOpenChange,
  busy,
  onGenerate,
}: AiDiagramDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<AiDiagramKind>("flowchart");

  const reset = () => {
    setPrompt("");
    setKind("flowchart");
  };

  const submit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;

    const saved = await onGenerate({ prompt: trimmed, kind });
    if (saved) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-500" />
            Generate AI diagram
          </DialogTitle>
          <DialogDescription>
            Describe the flow, system or idea and the AI will sketch it onto your
            whiteboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-diagram-kind">Diagram type</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {KIND_OPTIONS.map((option) => {
                const selected = kind === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setKind(option.value)}
                    className={
                      selected
                        ? "rounded-lg bg-primary/10 px-2 py-1.5 text-center text-[11px] font-medium text-primary ring-1 ring-primary/30"
                        : "rounded-lg bg-muted/50 px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground hover:bg-muted"
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-diagram-prompt">Prompt</Label>
            <textarea
              id="ai-diagram-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="e.g. Customer onboarding: signup → email verification → dashboard → invite teammate → upgrade to Pro"
              rows={4}
              className="flex min-h-24 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
            <div className="flex flex-wrap gap-1.5">
              {(EXAMPLES[kind] ?? []).map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="rounded-full bg-muted/60 px-2.5 py-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />} disabled={busy}>
            Cancel
          </DialogClose>
          <Button onClick={() => void submit()} disabled={busy || !prompt.trim()}>
            {busy ? "Generating…" : "Generate diagram"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
