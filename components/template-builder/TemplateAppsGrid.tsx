"use client";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { NotebookPen, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { getTemplateApps } from "@/app/template-builder/actions";
import { TemplateAppCard } from "@/components/template-builder/TemplateAppCard";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { TemplateApp } from "@/lib/template-builder/types";

type TemplateAppsGridProps = {
  refreshKey: number;
  onChange?: () => void;
};

export function TemplateAppsGrid({ refreshKey, onChange }: TemplateAppsGridProps) {
  const [apps, setApps] = useState<TemplateApp[]>([]);

  const loadApps = useCallback(async () => {
    const result = await getTemplateApps();
    if (result.ok) {
      setApps(result.data);
    } else {
      toast.add({ title: "Could not load apps", description: result.error, type: "error" });
    }
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps, refreshKey]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">
            Created Apps
          </h2>
          <p className="text-xs text-muted-foreground">
            Apps you have generated with AI. Each is saved to your account only.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadApps}>
          <Sparkles className="size-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {apps.length === 0 ? (
        <Empty className="cozy-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NotebookPen className="size-6" strokeWidth={1.5} />
            </EmptyMedia>
            <EmptyTitle>No apps yet</EmptyTitle>
            <EmptyDescription>
              Enter a prompt above and generate your first AI mini app.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {apps.map((app) => (
            <TemplateAppCard key={app.id} app={app} onChange={onChange ?? (() => {})} />
          ))}
        </div>
      )}
    </div>
  );
}
