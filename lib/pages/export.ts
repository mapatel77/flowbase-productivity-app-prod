import type { JSONContent } from "@tiptap/core";

import type { PageDocument } from "@/lib/pages/types";

type Mark = { type: string; attrs?: Record<string, unknown> };

type Node = JSONContent & { attrs?: Record<string, unknown>; marks?: Mark[] };

/** Escapes the characters that would otherwise break Markdown formatting. */
function escapeText(value: string): string {
  return value.replace(/([\\`*_[\]])/g, "\\$1");
}

/** Renders inline marks (bold, italic, code, strike, links). */
function renderText(node: Node): string {
  let value = escapeText(node.text ?? "");

  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") value = `**${value}**`;
    else if (mark.type === "italic") value = `_${value}_`;
    else if (mark.type === "strike") value = `~~${value}~~`;
    else if (mark.type === "code") value = `\`${value}\``;
    else if (mark.type === "link") {
      const href = String(mark.attrs?.href ?? "");
      value = href ? `[${value}](${href})` : value;
    }
  }

  return value;
}

/** Renders the inline children of a block node. */
function renderInline(content: JSONContent[] | undefined): string {
  if (!content) return "";

  return content
    .map((child) => {
      if (child.type === "hardBreak") return "\n";
      if (child.type === "text") return renderText(child as Node);
      return renderBlock(child as Node);
    })
    .join("");
}

function renderChildren(node: Node): string {
  return (node.content ?? []).map((child) => renderBlock(child as Node)).join("\n\n");
}

/** Converts a single Tiptap node into Markdown. */
function renderBlock(node: Node): string {
  switch (node.type) {
    case "doc":
      return renderChildren(node);

    case "paragraph":
      return renderInline(node.content);

    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      return `${"#".repeat(Math.min(Math.max(level, 1), 6))} ${renderInline(node.content)}`;
    }

    case "bulletList":
      return (node.content ?? [])
        .map((item) => `- ${renderChildren(item as Node)}`)
        .join("\n");

    case "orderedList":
      return (node.content ?? [])
        .map((item, index) => `${index + 1}. ${renderChildren(item as Node)}`)
        .join("\n");

    case "taskList":
      return (node.content ?? [])
        .map((item) => {
          const checked = Boolean((item as Node).attrs?.checked);
          const marker = checked ? "- [x]" : "- [ ]";
          return `${marker} ${renderChildren(item as Node)}`;
        })
        .join("\n");

    case "taskItem":
      return renderChildren(node);

    case "listItem":
      return renderChildren(node);

    case "blockquote":
      return renderChildren(node)
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");

    case "codeBlock": {
      const language = String(node.attrs?.language ?? "");
      return `\`\`\`${language}\n${renderInline(node.content)}\n\`\`\``;
    }

    case "horizontalRule":
      return "---";

    case "hardBreak":
      return "\n";

    case "text":
      return renderText(node);

    default:
      return node.content ? renderChildren(node) : "";
  }
}

/** Converts a page document into a Markdown string. */
export function pageToMarkdown(
  title: string,
  content: PageDocument | null | undefined,
): string {
  const body = content ? renderBlock(content as Node).trim() : "";
  const heading = `# ${title}`.trim();

  return body ? `${heading}\n\n${body}\n` : `${heading}\n`;
}

/** Turns a page title into a safe file name. */
export function pageFileName(title: string): string {
  const safe = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safe || "page";
}
