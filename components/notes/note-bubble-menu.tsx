"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { ReactNode } from "react";
import {
  Bold,
  Code,
  Feather,
  Highlighter,
  Italic,
  Loader2,
  Maximize2,
  MessageSquareText,
  Minimize2,
  RefreshCw,
  Sparkles,
  SpellCheck2,
  Strikethrough,
  Underline,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { REFINE_MODE_LABELS, REFINE_TONE_LABELS } from "@/lib/notes/constants";
import {
  REFINE_TONES,
  type RefineMode,
  type RefineTone,
} from "@/lib/notes/types";
import { cn } from "@/lib/utils";

type NoteBubbleMenuProps = {
  editor: Editor;
  refining: boolean;
  onRefine: (mode: RefineMode, tone?: RefineTone) => void;
};

const refineActions = [
  { mode: "grammar", icon: SpellCheck2 },
  { mode: "rephrase", icon: RefreshCw },
  { mode: "shorter", icon: Minimize2 },
  { mode: "longer", icon: Maximize2 },
  { mode: "simplify", icon: Feather },
] as const satisfies ReadonlyArray<{
  mode: Exclude<RefineMode, "tone">;
  icon: typeof SpellCheck2;
}>;

type BubbleButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function BubbleButton({
  label,
  active = false,
  onClick,
  children,
}: BubbleButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "rounded-md text-muted-foreground hover:text-foreground",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </Button>
  );
}

/** Selection bubble with quick formatting and Gemini-powered AI Refine. */
export function NoteBubbleMenu({
  editor,
  refining,
  onRefine,
}: NoteBubbleMenuProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      code: current.isActive("code"),
      highlight: current.isActive("highlight"),
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      updateDelay={100}
      shouldShow={({ editor: current }) =>
        current.isEditable && !current.state.selection.empty
      }
      options={{ placement: "top", offset: 10, flip: true, shift: true }}
      appendTo={() => document.body}
      className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-popover p-1 text-popover-foreground shadow-xl"
    >
      <BubbleButton
        label="Bold"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </BubbleButton>
      <BubbleButton
        label="Italic"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </BubbleButton>
      <BubbleButton
        label="Underline"
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline />
      </BubbleButton>
      <BubbleButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough />
      </BubbleButton>
      <BubbleButton
        label="Inline code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code />
      </BubbleButton>
      <BubbleButton
        label="Highlight"
        active={state.highlight}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter />
      </BubbleButton>

      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={refining}
              aria-label="AI Refine selected text"
              className="h-6 gap-1 rounded-md bg-gradient-to-r from-sky-500 to-violet-500 px-2 text-[10px] font-semibold text-white shadow-sm hover:from-sky-600 hover:to-violet-600 disabled:opacity-80"
            />
          }
        >
          {refining ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles />
          )}
          {refining ? "Refining…" : "AI Refine"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {refineActions.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.mode}
                onClick={() => onRefine(action.mode)}
                disabled={refining}
              >
                <Icon />
                {REFINE_MODE_LABELS[action.mode]}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={refining}>
              <MessageSquareText />
              Change tone
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              {REFINE_TONES.map((tone) => (
                <DropdownMenuItem
                  key={tone}
                  onClick={() => onRefine("tone", tone)}
                  disabled={refining}
                >
                  {REFINE_TONE_LABELS[tone]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </BubbleMenu>
  );
}
