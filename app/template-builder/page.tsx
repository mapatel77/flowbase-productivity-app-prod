import { TemplateBuilderClient } from "@/components/template-builder/PromptForm";

type TemplateBuilderSearchParams = Record<string, string | string[] | undefined>;

type TemplateBuilderPageProps = {
  // Next.js 16 exposes searchParams as a promise on server-rendered pages.
  searchParams: Promise<TemplateBuilderSearchParams>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TemplateBuilderPage({
  searchParams,
}: TemplateBuilderPageProps) {
  const params = await searchParams;
  const focusPrompt = firstParam(params.action) === "generate";

  return <TemplateBuilderClient focusPrompt={focusPrompt} />;
}
