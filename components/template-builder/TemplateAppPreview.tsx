"use client";

import { format } from "date-fns";

import { resolveLucideIcon } from "@/lib/template-builder/icons";
import { setSidebarPosition } from "@/app/template-builder/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import type { AppSection, TemplateAppConfig } from "@/lib/template-builder/types";

type StatItem = {
  label: string;
  value: string | number;
  delta?: string;
};

type ListRow = {
  label: string;
  value?: string | number;
  done?: boolean;
};

type TemplateAppPreviewProps = {
  app: {
    id: number;
    appName: string;
    description: string;
    icon: string;
    color: string;
    createdAt: Date;
    config: TemplateAppConfig;
    sidebarPosition: number | null;
  };
};

function toStatItem(row: Record<string, unknown>): StatItem {
  return {
    label: String(row.label ?? row.title ?? row.name ?? "Metric"),
    value: (row.value as string | number) ?? "—",
    delta: typeof row.delta === "string" ? row.delta : undefined,
  };
}

function toListRow(row: Record<string, unknown>): ListRow {
  return {
    label: String(row.label ?? row.title ?? row.name ?? "Item"),
    value: row.value as string | number | undefined,
    done: Boolean(row.done),
  };
}

function renderSection(section: AppSection): React.ReactNode {
  const rows = Array.isArray(section.data) ? (section.data as Record<string, unknown>[]) : [];

  switch (section.type) {
    case "stats": {
      const stats = rows.map(toStatItem);
      return (
        <section className="flex flex-col gap-4">
          <h3 className="font-heading text-sm font-semibold">{section.title}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <Card key={i} className="p-3">
                <CardContent className="p-0 pt-1">
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-lg font-semibold">{stat.value}</p>
                    </div>
                    {stat.delta && (
                      <Badge variant="outline" className="text-xs">{stat.delta}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      );
    }
    case "list": {
      const items = rows.map(toListRow);
      return (
        <section className="flex flex-col gap-4">
          <h3 className="font-heading text-sm font-semibold">{section.title}</h3>
          <ul className="divide-y divide-border/50">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 py-2 text-sm">
                {item.done && (
                  <span className="mt-1 shrink-0 flex items-center">
                    <span className="flex size-3.5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                      <CheckIcon />
                    </span>
                  </span>
                )}
                <span className="leading-none">{item.label}</span>
                {item.value !== undefined && (
                  <span className="ml-auto text-xs text-muted-foreground">{String(item.value)}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "table": {
      const headers = section.fields.map((f) => f.label);
      if (!headers.length) return null;
      return (
        <section className="flex flex-col gap-4">
          <h3 className="font-heading text-sm font-semibold">{section.title}</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    {headers.map((h) => (
                      <TableCell key={h}>{String(row[h] ?? "")}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      );
    }
    case "form": {
      return (
        <section className="flex flex-col gap-4">
          <h3 className="font-heading text-sm font-semibold">{section.title}</h3>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
            {section.fields.map((f) => (
              <div key={f.name} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{f.label}{f.required ? " *" : ""}</label>
                {f.type === "checkbox" ? (
                  <Checkbox defaultChecked={rows.length ? Boolean((rows[0] as Record<string, unknown>)[f.name]) : false} />
                ) : f.type === "select" && f.options ? (
                  <select defaultValue={f.options[0]} className="h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                    {f.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === "date" ? (
                  <Input type="date" className="h-8" />
                ) : f.type === "number" ? (
                  <Input type="number" className="h-8" />
                ) : (
                  <Input className="h-8" />
                )}
              </div>
            ))}
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{section.fields.length ? "Save" : "Save"}</Button>
              <Button variant="outline">Cancel</Button>
            </div>
          </form>
        </section>
      );
    }
    case "progress": {
      return (
        <section className="flex flex-col gap-4">
          <h3 className="font-heading text-sm font-semibold">{section.title}</h3>
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span>{String(row.label ?? row.title ?? "Progress")}</span>
                  <span>{String(row.value ?? 0)}%</span>
                </div>
                <Progress value={Number(row.value ?? 0)} />
              </div>
            ))}
          </div>
        </section>
      );
    }
    case "checklist": {
      return (
        <section className="flex flex-col gap-4">
          <h3 className="font-heading text-sm font-semibold">{section.title}</h3>
          <ul className="divide-y divide-border/50">
            {rows.map((row, i) => (
              <li key={i} className="flex items-center gap-3 py-2 text-sm">
                <Checkbox defaultChecked={Boolean(row.done)} />
                <span className="flex-1">{String(row.label ?? row.title ?? "Item")}</span>
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "buttons": {
      return (
        <section className="flex flex-col gap-4">
          <h3 className="font-heading text-sm font-semibold">{section.title}</h3>
          <div className="flex flex-wrap gap-2">
            {rows.map((row, i) => (
              <Button key={i} variant={i === 0 ? "default" : "outline"}>
                {String(row.label ?? `Action ${i + 1}`)}
              </Button>
            ))}
          </div>
        </section>
      );
    }
    case "tags": {
      return (
        <section className="flex flex-col gap-4">
          <h3 className="font-heading text-sm font-semibold">{section.title}</h3>
          <div className="flex flex-wrap gap-2">
            {rows.map((row, i) => (
              <Badge key={i} variant="outline" className="text-sm">
                {String(row.label ?? row.name ?? `Tag ${i + 1}`)}
              </Badge>
            ))}
          </div>
        </section>
      );
    }
    case "chart": {
      return (
        <section className="flex flex-col gap-4">
          <h3 className="font-heading text-sm font-semibold">{section.title}</h3>
          <div className="aspect-[4/3] w-full rounded-xl border border-dashed bg-muted/50 p-4 flex items-center justify-center text-sm text-muted-foreground">
            Chart placeholder — {String(rows[0]?.label ?? rows[0]?.title ?? "data")}
          </div>
        </section>
      );
    }
    default:
      return null;
  }
}

export function TemplateAppPreview({ app }: TemplateAppPreviewProps) {
  const Icon = resolveLucideIcon(app.icon);

  const handlePin = async (position: number | null) => {
    const result = await setSidebarPosition({ id: app.id, position });
    if (!result.ok) {
      toast.add({ title: "Could not update sidebar", description: result.error, type: "error" });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted p-1 ring-1 ring-border">
            <Icon className="size-5" />
          </span>
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">{app.appName}</h1>
            <p className="text-xs text-muted-foreground">{app.description}</p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <Badge variant="outline">{app.color}</Badge>
          <span className="text-xs text-muted-foreground">{format(app.createdAt, "MMM d, yyyy")}</span>
          <Button size="sm" onClick={() => handlePin(app.sidebarPosition ? null : 0)}>
            {app.sidebarPosition !== null ? "Remove from Sidebar" : "Add to Sidebar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {app.config.sections.map((section) => (
          <Card key={section.id} className="cozy-card">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>{renderSection(section)}</CardContent>
          </Card>
        ))}
      </div>

      {app.config.actions.length > 0 && (
        <section className="cozy-card p-4">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {app.config.actions.map((action, i) => (
                <Button key={i} variant="outline">
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </section>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
