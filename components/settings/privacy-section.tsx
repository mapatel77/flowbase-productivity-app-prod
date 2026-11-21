"use client";

import {
  Database,
  Download,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useState, useTransition } from "react";

import { deleteAccount } from "@/app/settings/actions";
import { ManageAccountButton } from "@/components/settings/clerk-account-actions";
import { usePreferences } from "@/components/preferences-provider";
import {
  SettingsDivider,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { useSettingsSaver } from "@/components/settings/use-settings-saver";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { UserSettings } from "@/lib/settings/types";

const privacyRows: Array<{
  key:
    | "privacyProfileDiscoverable"
    | "privacyShowActivity"
    | "privacyAnalytics";
  title: string;
  description: string;
}> = [
  {
    key: "privacyProfileDiscoverable",
    title: "Discoverable profile",
    description: "Let collaborators find you when they invite people to a space or board.",
  },
  {
    key: "privacyShowActivity",
    title: "Show activity",
    description: "Display when you were last active on shared pages and boards.",
  },
  {
    key: "privacyAnalytics",
    title: "Usage analytics",
    description: "Share anonymous usage data to help us improve Flowbase.",
  },
];

export function PrivacySection({
  clerkConfigured,
}: {
  clerkConfigured: boolean;
}) {
  const { settings } = usePreferences();
  const { save, pending } = useSettingsSaver();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteAccount({ confirmation });

      if (!result.ok) {
        toast.add({
          title: "Could not delete your account",
          description: result.error,
          type: "error",
        });
        return;
      }

      toast.add({
        title: "Your account was deleted",
        description: "Thanks for spending time in Flowbase.",
        type: "success",
      });

      setDeleteOpen(false);
      window.location.href = "/";
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Privacy"
        description="Decide what other people can see and what helps us improve."
        icon={ShieldCheck}
        iconClassName="text-emerald-500 dark:text-emerald-400"
      >
        <div className="flex flex-col divide-y divide-border/60">
          {privacyRows.map((row) => (
            <SettingsRow
              key={row.key}
              title={row.title}
              description={row.description}
            >
              <Switch
                checked={settings[row.key]}
                disabled={pending === row.key}
                onCheckedChange={(checked) =>
                  void save(
                    { [row.key]: checked } as Partial<UserSettings>,
                    {
                      key: row.key,
                      success: `${row.title} ${checked ? "on" : "off"}`,
                      quiet: true,
                    },
                  )
                }
                aria-label={`Toggle ${row.title}`}
              />
            </SettingsRow>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Your data"
        description="Take a copy of your workspace or review account security."
        icon={Database}
        iconClassName="text-sky-500 dark:text-sky-400"
      >
        <SettingsRow
          title="Export workspace data"
          description="Download notes, pages, boards, calendar entries, categories and whiteboards as JSON."
        >
          <Button
            variant="outline"
            className="h-9 rounded-xl"
            render={<a href="/api/export" download />}
          >
            <Download />
            Export JSON
          </Button>
        </SettingsRow>

        <SettingsDivider />

        <SettingsRow
          title="Account access"
          description={
            clerkConfigured
              ? "Update your password, email and connected sign-in methods in Clerk."
              : "Connect Clerk to enable account security controls."
          }
        >
          {clerkConfigured ? (
            <ManageAccountButton className="h-9 rounded-xl" />
          ) : (
            <Button
              variant="outline"
              className="h-9 rounded-xl"
              disabled
            >
              <LockKeyhole />
              Manage account
            </Button>
          )}
        </SettingsRow>
      </SettingsSection>

      <section className="overflow-hidden rounded-2xl border border-destructive/25 bg-destructive/[0.035]">
        <header className="flex items-start gap-3 border-b border-destructive/15 px-4 py-4 sm:px-5">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-4" />
          </span>
          <div>
            <h2 className="font-heading text-base font-semibold tracking-tight text-destructive">
              Danger zone
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Permanently remove your account and everything inside it.
            </p>
          </div>
        </header>
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground">
            This deletes your notes, pages, spaces, boards, calendar entries,
            whiteboards and categories. It cannot be undone.
          </p>
          <Button
            type="button"
            variant="destructive"
            className="h-9 shrink-0 rounded-xl"
            onClick={() => {
              setConfirmation("");
              setDeleteOpen(true);
            }}
          >
            <Trash2 />
            Delete account
          </Button>
        </div>
      </section>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setDeleteOpen(open);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="size-4" />
              Delete your account?
            </DialogTitle>
            <DialogDescription>
              Every note, space, board and calendar entry will be deleted
              permanently. Type <span className="font-semibold">DELETE</span> to
              confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-confirmation">Confirmation</Label>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              className="h-10 rounded-xl"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Keep my account
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || confirmation.trim().toUpperCase() !== "DELETE"}
            >
              {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
