"use client";

import { Extension, type Editor } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Pilcrow,
  Quote,
  SquareCode,
  type LucideIcon,
} from "lucide-react";
import { Component } from "react";

import { cn } from "@/lib/utils";

type SlashRange = { from: number; to: number };

type SlashItem = {
  id: string;
  title: string;
  description: string;
  keywords: string;
  icon: LucideIcon;
  run: (editor: Editor, range: SlashRange) => void;
};

const SLASH_ITEMS: SlashItem[] = [
  {
    id: "text",
    title: "Text",
    description: "Start writing with a plain paragraph.",
    keywords: "paragraph body plain",
    icon: Pilcrow,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    id: "heading-1",
    title: "Heading 1",
    description: "A large section heading.",
    keywords: "title h1 large",
    icon: Heading1,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    id: "heading-2",
    title: "Heading 2",
    description: "A medium section heading.",
    keywords: "subtitle h2 medium",
    icon: Heading2,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    id: "heading-3",
    title: "Heading 3",
    description: "A small section heading.",
    keywords: "subtitle h3 small",
    icon: Heading3,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    id: "bullet-list",
    title: "Bullet list",
    description: "A simple, unordered list.",
    keywords: "unordered bullet points",
    icon: List,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: "numbered-list",
    title: "Numbered list",
    description: "An ordered list with numbers.",
    keywords: "ordered numbers steps",
    icon: ListOrdered,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: "todo-list",
    title: "To-do list",
    description: "A checklist you can tick off.",
    keywords: "task checklist todo checkbox",
    icon: ListTodo,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    id: "quote",
    title: "Quote",
    description: "Set apart a quote or an idea.",
    keywords: "blockquote citation",
    icon: Quote,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: "code-block",
    title: "Code block",
    description: "A monospaced block for code.",
    keywords: "code snippet mono",
    icon: SquareCode,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: "divider",
    title: "Divider",
    description: "A thin line between sections.",
    keywords: "line separator rule horizontal",
    icon: Minus,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

function filterSlashItems(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return SLASH_ITEMS;

  return SLASH_ITEMS.filter((item) =>
    `${item.title} ${item.description} ${item.keywords}`
      .toLowerCase()
      .includes(normalized),
  );
}

type SlashCommandListProps = {
  items: SlashItem[];
  command: (item: SlashItem) => void;
  query: string;
};

class SlashCommandList extends Component<
  SlashCommandListProps,
  { selected: number }
> {
  state = { selected: 0 };

  componentDidUpdate(previous: SlashCommandListProps) {
    if (
      previous.query !== this.props.query ||
      this.state.selected >= this.props.items.length
    ) {
      this.setState({ selected: 0 });
    }
  }

  selectItem(index: number) {
    const item = this.props.items[index];
    if (item) this.props.command(item);
  }

  onKeyDown = ({ event }: SuggestionKeyDownProps) => {
    const { items } = this.props;
    if (items.length === 0) return false;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.setState((state) => ({
        selected: (state.selected + 1) % items.length,
      }));
      return true;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.setState((state) => ({
        selected: (state.selected - 1 + items.length) % items.length,
      }));
      return true;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      this.selectItem(this.state.selected);
      return true;
    }

    return false;
  };

  render() {
    const { items, query } = this.props;

    return (
      <div className="max-h-80 w-64 overflow-y-auto rounded-xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
        <p className="px-2 py-1 text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {query ? "Matching blocks" : "Blocks"}
        </p>
        {items.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No matching blocks. Try another word.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => this.selectItem(index)}
                  onMouseEnter={() => this.setState({ selected: index })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                    index === this.state.selected
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-card ring-1 ring-border/70">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}

type SlashRenderer = ReactRenderer<
  SlashCommandList,
  SlashCommandListProps
>;

/**
 * Registers `/` as a block-insertion trigger. The menu is rendered through
 * Tiptap's ReactRenderer and anchored by the suggestion plugin's mount helper.
 */
export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => {
          props.run(editor, range);
        },
        render: () => {
          let component: SlashRenderer | null = null;
          let unmount: (() => void) | null = null;

          return {
            onStart: (props: SuggestionProps<SlashItem, SlashItem>) => {
              component = new ReactRenderer<
                SlashCommandList,
                SlashCommandListProps
              >(SlashCommandList, {
                editor: props.editor,
                props: {
                  items: props.items,
                  command: props.command,
                  query: props.query,
                },
              });
              unmount = props.mount(component.element);
            },

            onUpdate: (props: SuggestionProps<SlashItem, SlashItem>) => {
              component?.updateProps({
                items: props.items,
                command: props.command,
                query: props.query,
              });
            },

            onKeyDown: (props: SuggestionKeyDownProps) => {
              return component?.ref?.onKeyDown(props) ?? false;
            },

            onExit: () => {
              unmount?.();
              unmount = null;
              component?.destroy();
              component = null;
            },
          };
        },
      }),
    ];
  },
});
