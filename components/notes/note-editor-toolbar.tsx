"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import type { ReactNode } from "react";
import {
  Bold,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type EditorToolbarProps = {
  editor: Editor;
};

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "shrink-0 rounded-md text-muted-foreground",
        active && "bg-muted/80 text-foreground",
      )}
    >
      {children}
    </Button>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-border/70" aria-hidden="true" />;
}

/** Fixed formatting toolbar for the note editor. */
export function NoteEditorToolbar({ editor }: EditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      code: current.isActive("code"),
      highlight: current.isActive("highlight"),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      taskList: current.isActive("taskList"),
      quote: current.isActive("blockquote"),
      codeBlock: current.isActive("codeBlock"),
      paragraph: current.isActive("paragraph"),
      heading1: current.isActive("heading", { level: 1 }),
      heading2: current.isActive("heading", { level: 2 }),
      heading3: current.isActive("heading", { level: 3 }),
      canUndo: current.can().chain().undo().run(),
      canRedo: current.can().chain().redo().run(),
    }),
  });

  const blockOptions = [
    {
      label: "Text",
      icon: Pilcrow,
      active: state.paragraph,
      run: () => editor.chain().focus().setParagraph().run(),
    },
    {
      label: "Heading 1",
      icon: Heading1,
      active: state.heading1,
      run: () => editor.chain().focus().setHeading({ level: 1 }).run(),
    },
    {
      label: "Heading 2",
      icon: Heading2,
      active: state.heading2,
      run: () => editor.chain().focus().setHeading({ level: 2 }).run(),
    },
    {
      label: "Heading 3",
      icon: Heading3,
      active: state.heading3,
      run: () => editor.chain().focus().setHeading({ level: 3 }).run(),
    },
    {
      label: "Quote",
      icon: Quote,
      active: state.quote,
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Code block",
      icon: SquareCode,
      active: state.codeBlock,
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "Divider",
      icon: Minus,
      active: false,
      run: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];

  const activeBlock = blockOptions.find((option) => option.active) ?? blockOptions[0];
  const ActiveBlockIcon = activeBlock.icon;

  return (
    <div className="shrink-0 border-b border-border/40">
      <div className="relative mx-auto w-full max-w-3xl px-3 md:px-7">
        <div
          className="note-toolbar-scroll flex items-center gap-0.5 overflow-x-auto py-1.5"
          role="toolbar"
          aria-label="Note formatting"
        >
        <ToolbarButton
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!state.canUndo}
        >
          <Undo2 />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!state.canRedo}
        >
          <Redo2 />
        </ToolbarButton>

        <ToolbarDivider />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              />
            }
          >
            <ActiveBlockIcon className="size-3.5" />
            <span className="max-w-24 truncate">{activeBlock.label}</span>
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {blockOptions.map((option) => {
              const Icon = option.icon;
              return (
                <DropdownMenuItem
                  key={option.label}
                  onClick={option.run}
                  className={cn(option.active && "bg-muted/70")}
                >
                  <Icon />
                  {option.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarDivider />

        <ToolbarButton
          label="Bold"
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={state.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={state.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough />
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          active={state.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code />
        </ToolbarButton>
        <ToolbarButton
          label="Highlight"
          active={state.highlight}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Bullet list"
          active={state.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={state.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>
        <ToolbarButton
          label="To-do list"
          active={state.taskList}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListTodo />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={state.quote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </ToolbarButton>
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent md:hidden"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
