"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { createTemplateAppFromPrompt } from "@/app/template-builder/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

type PromptFormProps = {
  onAppCreated: () => void;
};

export function PromptForm({ onAppCreated }: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

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
      <div className="flex flex-col gap-2">
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
