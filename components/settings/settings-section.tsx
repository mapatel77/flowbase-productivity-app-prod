import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SettingsSection({
  title,
  description,
  icon: Icon,
  iconClassName,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("cozy-card overflow-hidden", className)}>
      <header className="flex items-start gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
        {Icon ? (
          <span
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/70",
              iconClassName,
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </header>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

export function SettingsRow({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {children}
      </div>
    </div>
  );
}

export function SettingsDivider() {
  return <div className="my-1 h-px bg-border/60" />;
}
