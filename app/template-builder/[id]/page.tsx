import { notFound } from "next/navigation";

import { getTemplateApp } from "@/app/template-builder/actions";
import { TemplateAppPreview } from "@/components/template-builder/TemplateAppPreview";

export default async function TemplateAppPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const result = await getTemplateApp(id);

  if (!result.ok) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <TemplateAppPreview app={result.data} />
    </div>
  );
}
