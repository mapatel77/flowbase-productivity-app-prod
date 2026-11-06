import type { CommentBody } from "@liveblocks/client";

type InlineElement = {
  type?: string;
  text?: string;
  id?: string;
  url?: string;
};

function inlineToText(element: InlineElement): string {
  if (typeof element.text === "string") return element.text;
  if (element.type === "mention" && element.id) return `@${element.id}`;
  if (element.type === "link") return element.text ?? element.url ?? "";
  return "";
}

/** Converts the plain composer textarea into a Liveblocks comment body. */
export function textToCommentBody(text: string): CommentBody {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");

  return {
    version: 1,
    content: paragraphs.map((line) => ({
      type: "paragraph",
      children: line ? [{ text: line }] : [{ text: "" }],
    })),
  };
}

/** Flattens a comment body into readable text for the custom comment list. */
export function commentBodyToText(
  body: CommentBody | null | undefined,
): string {
  if (!body) return "";

  const lines: string[] = [];

  for (const block of body.content) {
    if (block.type !== "paragraph") continue;

    lines.push(
      block.children
        .map((child) => inlineToText(child as InlineElement))
        .join(""),
    );
  }

  return lines.join("\n").trim();
}
