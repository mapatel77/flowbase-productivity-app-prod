"use client";

import {
  Crown,
  MessageSquareText,
  Sparkles,
  WandSparkles,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";

import { usePreferences } from "@/components/preferences-provider";
import {
  SettingsDivider,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { useSettingsSaver } from "@/components/settings/use-settings-saver";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { PlanSnapshot } from "@/lib/billing/types";
import { REFINE_MODE_LABELS, REFINE_TONE_LABELS } from "@/lib/notes/constants";
import { REFINE_MODES, REFINE_TONES } from "@/lib/notes/types";
import { AI_CUSTOM_INSTRUCTIONS_MAX_LENGTH } from "@/lib/settings/constants";
import {
  AI_MODEL_LABELS,
  AI_MODEL_OPTIONS,
  type AiModelPreference,
  type UserSettings,
} from "@/lib/settings/types";

const featureToggles: Array<{
  key:
    | "aiRefineEnabled"
    | "aiAssistantEnabled"
    | "aiTemplateBuilderEnabled"
    | "aiDiagramEnabled";
  title: string;
  description: string;
}> = [
  {
    key: "aiRefineEnabled",
    title: "AI Refine",
    description:
      "Show the rewrite and tone actions in the editor bubble menu.",
  },
  {
    key: "aiAssistantEnabled",
    title: "AI Assistant",
    description: "Keep the workspace assistant available from the sidebar.",
  },
  {
    key: "aiTemplateBuilderEnabled",
    title: "AI Template Builder",
    description: "Generate reusable mini apps from a prompt.",
  },
  {
    key: "aiDiagramEnabled",
    title: "AI diagrams",
    description: "Turn a prompt into a structured whiteboard diagram.",
  },
];

export function AiSection({ plan }: { plan: PlanSnapshot }) {
  const { settings, updatePreferences } = usePreferences();
  const { save, pending } = useSettingsSaver();
  const [instructions, setInstructions] = useState(settings.aiCustomInstructions);

  useEffect(() => {
    setInstructions(settings.aiCustomInstructions);
  }, [settings.aiCustomInstructions]);

  const instructionsDirty =
    instructions.trim() !== settings.aiCustomInstructions.trim();

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="AI model & behaviour"
        description="Choose how Flow AI writes, rewrites and builds for you."
        icon={Sparkles}
        iconClassName="text-violet-500 dark:text-violet-400"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Model</Label>
            <Select
              value={settings.aiModel}
              onValueChange={(value) => {
                if (value === null) return;
                void save(
                  { aiModel: value as AiModelPreference },
                  { key: "ai-model", success: "AI model updated" },
                );
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl">
                <SelectValue>
                  {(value) =>
                    AI_MODEL_LABELS[value as AiModelPreference] ?? "Choose a model"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {AI_MODEL_OPTIONS.map((model) => {
                  const requiresPro = model === "gemini-3.6-pro";

                  return (
                    <SelectItem
                      key={model}
                      value={model}
                      disabled={requiresPro && !plan.isPro}
                    >
                      <span className="flex w-full items-center gap-2">
                        {AI_MODEL_LABELS[model]}
                        {requiresPro ? (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-4 gap-1 px-1.5 text-[9px]"
                          >
                            <Crown className="size-2.5" />
                            Pro
                          </Badge>
                        ) : null}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {plan.isPro
                ? "Pro unlocks Gemini 3.6 Pro for longer, more careful drafts."
                : "The Pro model unlocks with a Pro plan. Flash is fast and included on Free."}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Default refine action</Label>
            <Select
              value={settings.aiDefaultMode}
              onValueChange={(value) => {
                if (value === null) return;
                void save(
                  { aiDefaultMode: value as UserSettings["aiDefaultMode"] },
                  { key: "ai-mode", success: "Default AI action updated" },
                );
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl">
                <SelectValue>
                  {(value) =>
                    REFINE_MODE_LABELS[value as UserSettings["aiDefaultMode"]] ??
                    "Choose an action"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {REFINE_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {REFINE_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Used when you tap the sparkle button in the editor.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Default tone</Label>
            <Select
              value={settings.aiTone}
              onValueChange={(value) => {
                if (value === null) return;
                void save(
                  { aiTone: value as UserSettings["aiTone"] },
                  { key: "ai-tone", success: "Default tone updated" },
                );
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl">
                <SelectValue>
                  {(value) =>
                    REFINE_TONE_LABELS[value as UserSettings["aiTone"]] ??
                    "Choose a tone"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {REFINE_TONES.map((tone) => (
                  <SelectItem key={tone} value={tone}>
                    {REFINE_TONE_LABELS[tone]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Applied when you ask Flow AI to change tone.
            </p>
          </div>
        </div>

        <SettingsDivider />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="ai-instructions">Custom instructions</Label>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {instructions.length}/{AI_CUSTOM_INSTRUCTIONS_MAX_LENGTH}
            </span>
          </div>
          <Textarea
            id="ai-instructions"
            value={instructions}
            maxLength={AI_CUSTOM_INSTRUCTIONS_MAX_LENGTH}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="e.g. Keep answers concise. Use British spelling. Avoid em dashes."
            className="min-h-24 rounded-xl"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Standing guidance is sent with every AI request.
            </p>
            <div className="flex items-center gap-2">
              {instructionsDirty ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-xs"
                  onClick={() => setInstructions(settings.aiCustomInstructions)}
                >
                  Reset
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="rounded-lg text-xs"
                disabled={!instructionsDirty || pending === "ai-instructions"}
                onClick={() =>
                  void save(
                    { aiCustomInstructions: instructions },
                    {
                      key: "ai-instructions",
                      success: "AI instructions saved",
                    },
                  )
                }
              >
                Save instructions
              </Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="AI features"
        description="Turn individual AI surfaces on or off without losing your data."
        icon={Workflow}
        iconClassName="text-sky-500 dark:text-sky-400"
      >
        <div className="flex flex-col divide-y divide-border/60">
          {featureToggles.map((feature) => (
            <SettingsRow
              key={feature.key}
              title={feature.title}
              description={feature.description}
            >
              <Switch
                checked={settings[feature.key]}
                disabled={pending === feature.key}
                onCheckedChange={(checked) =>
                  void save(
                    { [feature.key]: checked } as Partial<UserSettings>,
                    {
                      key: feature.key,
                      success: `${feature.title} ${
                        checked ? "enabled" : "disabled"
                      }`,
                    },
                  )
                }
                aria-label={`Toggle ${feature.title}`}
              />
            </SettingsRow>
          ))}
        </div>

        <SettingsDivider />

        <div className="flex items-start gap-2 rounded-xl border border-violet-200/70 bg-violet-50/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
          <MessageSquareText className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Turning off a feature hides its AI entry points. Existing notes,
            boards and diagrams stay untouched.
          </p>
        </div>
      </SettingsSection>

      <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-3 text-[11.5px] text-muted-foreground">
        <WandSparkles className="size-4 shrink-0 text-fuchsia-500 dark:text-fuchsia-400" />
        <p>
          Flow AI writes in your voice, but you stay in control. Always review
          generated text before sharing it.
        </p>
      </div>
    </div>
  );
}
