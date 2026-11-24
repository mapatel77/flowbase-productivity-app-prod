"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How does the AI Assistant work?",
    a: "Flow AI lives inside notes, tasks, calendar, and whiteboards. Ask it to draft content, summarise notes, create tasks, or generate diagrams — it acts on your workspace directly.",
  },
  {
    q: "Can I collaborate in real time?",
    a: "Yes. Boards, notes, and whiteboards sync live via Liveblocks. You'll see active presence, cursors, and comments as teammates work.",
  },
  {
    q: "Are notes like Notion?",
    a: "Flowbase notes are block-based and rich-text with slash commands, templates, and AI refine — familiar if you've used Notion, but integrated with tasks and calendar.",
  },
  {
    q: "What can the whiteboard do?",
    a: "An infinite canvas for diagrams, sticky notes, shapes, and freehand drawing — great for brainstorming and planning with your team.",
  },
  {
    q: "What is the AI Template Builder?",
    a: "Describe what you need and Flow AI generates a reusable page or whiteboard template, ready to use or customise.",
  },
  {
    q: "How is my data protected?",
    a: "Your data is encrypted in transit and at rest. We never train models on your private content, and you can export or delete your data at any time.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            FAQ
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <Accordion className="mt-10" defaultValue={["item-0"]}>
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">{f.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
