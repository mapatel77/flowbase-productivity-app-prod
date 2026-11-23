import { AiAssistantPage as AiAssistantPageView } from "@/components/ai-assistant/ai-assistant-page";

type AiAssistantSearchParams = Record<string, string | string[] | undefined>;

type AiAssistantPageProps = {
  // Next.js 16 exposes searchParams as a promise on server-rendered pages.
  searchParams: Promise<AiAssistantSearchParams>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AiAssistantPage({
  searchParams,
}: AiAssistantPageProps) {
  const params = await searchParams;
  const prompt = firstParam(params.prompt) ?? "";

  return <AiAssistantPageView initialPrompt={prompt} />;
}
