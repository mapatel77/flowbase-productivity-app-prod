"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";

import { getTemplateApps } from "@/app/template-builder/actions";
import { setSidebarPosition } from "@/app/template-builder/actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { TemplateApp } from "@/lib/template-builder/types";
import { cn } from "@/lib/utils";

export function SidebarPinnedApps() {
  const [apps, setApps] = useState<TemplateApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadApps = async () => {
    setLoading(true);
    try {
      const result = await getTemplateApps();
      if (result.ok) {
        const pinned = result.data
          .filter((app) => app.sidebarPosition !== null)
          .sort(
            (a, b) =>
              (a.sidebarPosition ?? 0) - (b.sidebarPosition ?? 0),
          );
        setApps(pinned);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, [refreshKey]);

  const handleRemove = async (app: TemplateApp) => {
    const result = await setSidebarPosition({ id: app.id, position: null });
    if (!result.ok) {
      toast.add({ title: "Could not remove", description: result.error, type: "error" });
      return;
    }
    setRefreshKey((k) => k + 1);
  };

  if (loading) return null;
  if (apps.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex h-8 items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase">
          Your Apps
        </span>
        {apps.length > 0 && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="h-6 w-6 p-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Refresh your apps"
          >
            <ArrowUpRight className="size-3" />
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {apps.map((app) => (
          <div
            key={app.id}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
              app.sidebarPosition !== null && "bg-sidebar-accent",
            )}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded font-medium text-[10px]">
              {app.appName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 truncate">{app.appName}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleRemove(app)}
              className="h-5 w-5 p-0 ml-auto text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label={`Remove ${app.appName} from sidebar`}
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
