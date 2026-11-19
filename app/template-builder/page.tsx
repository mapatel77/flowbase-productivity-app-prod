"use client";

import { useState } from "react";

import { TemplateAppsGrid } from "@/components/template-builder/TemplateAppsGrid";
import { PromptForm } from "@/components/template-builder/PromptForm";

export default function TemplateBuilderPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <PromptForm
        onAppCreated={() => setRefreshKey((key) => key + 1)}
      />
      <TemplateAppsGrid refreshKey={refreshKey} />
    </div>
  );
}
