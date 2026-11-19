/**
 * Shared TypeScript shape for the AI-generated template app JSON and the
 * persisted row. The AI is instructed to emit strict JSON matching
 * `TemplateAppConfig`; the renderer in `TemplateAppPreview` maps each
 * section type to a shadcn UI block.
 */

export interface TemplateAppConfig {
  appName: string;
  description: string;
  icon: string; // lucide icon name, e.g. "Flame", "Layout"
  color: string; // Flowbase color token, e.g. "sky", "emerald", "rose"
  layout: "single-page";
  sections: AppSection[];
  actions: AppAction[];
  sampleData: unknown;
}

export interface AppSection {
  id: string;
  title: string;
  type:
    | "stats"
    | "list"
    | "table"
    | "form"
    | "progress"
    | "checklist"
    | "buttons"
    | "tags"
    | "chart";
  components: AppComponent[];
  fields: AppField[];
  data?: unknown;
}

export interface AppComponent {
  kind: string;
  props: Record<string, unknown>;
}

export interface AppField {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "checkbox" | "select";
  required?: boolean;
  options?: string[];
}

export interface AppAction {
  label: string;
  kind: "save" | "add" | "delete" | "navigate";
  href?: string;
}

export interface TemplateApp {
  id: number;
  userId: number;
  appName: string;
  description: string;
  icon: string;
  color: string;
  layout: string;
  config: TemplateAppConfig;
  sidebarPosition: number | null;
  createdAt: Date;
  updatedAt: Date;
}
