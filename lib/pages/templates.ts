import {
  ClipboardList,
  FileText,
  Lightbulb,
  ListChecks,
  Rocket,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

import type { PageDocument, PageTemplate } from "@/lib/pages/types";

/** A heading followed by an empty paragraph. */
function heading(text: string) {
  return {
    type: "heading",
    attrs: { level: 2 },
    content: [{ type: "text", text }],
  };
}

/** A paragraph that already carries a little guidance text. */
function paragraph(text: string) {
  return {
    type: "paragraph",
    content: [{ type: "text", text }],
  };
}

/** A single unchecked task item. */
function task(text: string) {
  return {
    type: "taskItem",
    attrs: { checked: false },
    content: [paragraph(text)],
  };
}

export type PageTemplateOption = {
  value: PageTemplate;
  label: string;
  description: string;
  icon: LucideIcon;
  /** The document a page starts with when it is created from this template. */
  content: PageDocument;
};

export const PAGE_TEMPLATE_OPTIONS: PageTemplateOption[] = [
  {
    value: "blank",
    label: "Blank Page",
    description: "Start from an empty document",
    icon: FileText,
    content: {
      type: "doc",
      content: [paragraph("")],
    },
  },
  {
    value: "project-plan",
    label: "Project Plan",
    description: "Goals, milestones and a delivery timeline",
    icon: Rocket,
    content: {
      type: "doc",
      content: [
        heading("Overview"),
        paragraph("What are we building, and why does it matter?"),
        heading("Goals"),
        paragraph("List the outcomes this project should deliver."),
        heading("Milestones"),
        paragraph("1. —\n2. —\n3. —"),
        heading("Risks"),
        paragraph("What could slow this down?"),
      ],
    },
  },
  {
    value: "meeting-notes",
    label: "Meeting Notes",
    description: "Agenda, decisions and action items",
    icon: ClipboardList,
    content: {
      type: "doc",
      content: [
        heading("Attendees"),
        paragraph("Add everyone who joined."),
        heading("Agenda"),
        paragraph("1. —\n2. —"),
        heading("Notes"),
        paragraph("Capture the discussion here."),
        heading("Decisions"),
        paragraph("What did we agree on?"),
        heading("Action items"),
        paragraph("Who is doing what by when?"),
      ],
    },
  },
  {
    value: "prd",
    label: "PRD",
    description: "Problem, scope and success metrics",
    icon: ScrollText,
    content: {
      type: "doc",
      content: [
        heading("Problem"),
        paragraph("What pain are we removing, and for whom?"),
        heading("Goals"),
        paragraph("What does success look like?"),
        heading("Non-goals"),
        paragraph("What are we deliberately not doing?"),
        heading("User stories"),
        paragraph("As a … I want … so that …"),
        heading("Success metrics"),
        paragraph("How will we know it worked?"),
      ],
    },
  },
  {
    value: "research-notes",
    label: "Research Notes",
    description: "Question, sources and findings",
    icon: Lightbulb,
    content: {
      type: "doc",
      content: [
        heading("Question"),
        paragraph("What are you trying to find out?"),
        heading("Sources"),
        paragraph("Links, interviews, papers and datasets."),
        heading("Findings"),
        paragraph("What did you learn?"),
        heading("Next steps"),
        paragraph("What happens next?"),
      ],
    },
  },
  {
    value: "task-plan",
    label: "Task Plan",
    description: "A ready-to-tick checklist",
    icon: ListChecks,
    content: {
      type: "doc",
      content: [
        heading("Plan"),
        {
          type: "taskList",
          content: [
            task("First task"),
            task("Second task"),
            task("Third task"),
          ],
        },
      ],
    },
  },
];

const templateMap = new Map(
  PAGE_TEMPLATE_OPTIONS.map((option) => [option.value, option]),
);

/** The template option for a stored template key. */
export function getTemplateOption(value: string): PageTemplateOption {
  return (
    templateMap.get(value as PageTemplate) ??
    (templateMap.get("blank") as PageTemplateOption)
  );
}

/** Whether a stored template key is one this app knows about. */
export function isPageTemplate(value: unknown): value is PageTemplate {
  return (
    typeof value === "string" &&
    (templateMap.has(value as PageTemplate) ?? false)
  );
}
