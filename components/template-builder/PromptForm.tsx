"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { createTemplateAppFromPrompt } from "@/app/template-builder/actions";
import { TemplateAppsGrid } from "@/components/template-builder/TemplateAppsGrid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

type PromptFormProps = {
  onAppCreated: () => void;
  focusPrompt?: boolean;
};

export function PromptForm({ onAppCreated, focusPrompt = false }: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const promptSectionRef = useRef<HTMLDivElement>(null);
  const focusHandledRef = useRef(false);

  useEffect(() => {
    if (!focusPrompt) {
      focusHandledRef.current = false;
      return;
    }
    if (focusHandledRef.current) return;
    focusHandledRef.current = true;

    const textarea = promptSectionRef.current?.querySelector("textarea");
    if (!textarea) return;

    textarea.focus({ preventScroll: true });
    textarea.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusPrompt]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setGenerating(true);
    try {
      // Generation happens server-side (Gemini key never leaves the server).
      const result = await createTemplateAppFromPrompt({ prompt });

      if (!result.ok) {
        toast.add({
          title: "Could not generate the app",
          description: result.error,
          type: "error",
        });
        return;
      }

      setPrompt("");
      onAppCreated();
      toast.add({
        title: "App generated",
        description: `"${result.data.appName}" is ready to preview.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Generation failed. Try again.";
      toast.add({ title: "Generation failed", description: message, type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <form onSubmit={handleGenerate} className="flex flex-col gap-3">
      <div ref={promptSectionRef} className="flex flex-col gap-2">
        <label className="text-sm font-medium">What mini app would you like to build?</label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. A habit tracker with streaks, weekly progress and daily check-ins"
          disabled={generating}
          className="min-h-[140px] resize-y"
        />
      </div>
      <Button
        type="submit"
        disabled={generating || !prompt.trim()}
        className="w-auto"
      >
        {generating ? (
          <>
            <Sparkles className="size-4 animate-spin mr-2" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="size-4 mr-2" />
            Generate app
          </>
        )}
      </Button>
    </form>
  );
}

/** Client-side shell for the template builder route. */
export function TemplateBuilderClient({
  focusPrompt,
}: {
  focusPrompt: boolean;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <PromptForm
        focusPrompt={focusPrompt}
        onAppCreated={() => setRefreshKey((key) => key + 1)}
      />
      <TemplateAppsGrid refreshKey={refreshKey} />
    </div>
  );
}
