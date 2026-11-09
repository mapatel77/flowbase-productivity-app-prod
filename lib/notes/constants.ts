import type { ColorToken } from "@/lib/calendar/colors";

import type { RefineMode, RefineTone } from "@/lib/notes/types";

export const DEFAULT_NOTE_TITLE = "Untitled note";
export const DEFAULT_NOTE_COLOR: ColorToken = "amber";
export const NOTE_TITLE_MAX_LENGTH = 120;
export const NOTE_SAVE_DEBOUNCE_MS = 800;
export const NOTE_SELECTION_MAX_LENGTH = 6000;

export const REFINE_MODE_LABELS: Record<RefineMode, string> = {
  grammar: "Improve grammar",
  rephrase: "Rephrase",
  shorter: "Make shorter",
  longer: "Make longer",
  simplify: "Simplify language",
  tone: "Change tone",
};

export const REFINE_TONE_LABELS: Record<RefineTone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  casual: "Casual",
  confident: "Confident",
};
