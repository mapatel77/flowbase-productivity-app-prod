"use client";

import { Loader2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useState, useTransition } from "react";

import { updateProfileName } from "@/app/settings/actions";
import {
  ManageAccountButton,
  SignOutButton,
} from "@/components/settings/clerk-account-actions";
import {
  SettingsDivider,
  SettingsSection,
} from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import type { CurrentUserProfile } from "@/lib/calendar/user";

export function ProfileSection({
  profile,
  clerkConfigured,
  onNameSaved,
}: {
  profile: CurrentUserProfile;
  clerkConfigured: boolean;
  onNameSaved: (name: string) => void;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [savedName, setSavedName] = useState(profile.name ?? "");
  const [isPending, startTransition] = useTransition();

  const dirty = name.trim() !== savedName.trim();

  const handleSave = () => {
    const next = name.trim();

    if (!next) {
      toast.add({
        title: "Add your name first",
        description: "A name makes your workspace feel like yours.",
        type: "error",
      });
      return;
    }

    startTransition(async () => {
      const result = await updateProfileName({ name: next });

      if (!result.ok) {
        toast.add({
          title: "Could not update your profile",
          description: result.error,
          type: "error",
        });
        return;
      }

      setName(result.data.name);
      setSavedName(result.data.name);
      onNameSaved(result.data.name);
      toast.add({
        title: "Profile updated",
        description: "Your name is up to date across Flowbase.",
        type: "success",
      });
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Profile"
        description="How you show up in spaces, boards and shared pages."
        icon={UserRound}
        iconClassName="text-rose-500 dark:text-rose-400"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-name">Display name</Label>
            <Input
              id="settings-name"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && dirty) handleSave();
              }}
              placeholder="Your name"
              className="h-10 rounded-xl bg-card"
            />
            <p className="text-[11px] text-muted-foreground">
              Shown on shared boards, pages and comments.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-email">
              <Mail className="size-4 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="settings-email"
              value={profile.email}
              readOnly
              disabled
              className="h-10 rounded-xl bg-muted/40"
            />
            <p className="text-[11px] text-muted-foreground">
              {clerkConfigured
                ? "Managed by Clerk. Change it from your account profile."
                : "Local demo account — connect Clerk to manage identity."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">
            {dirty
              ? "You have unsaved profile changes."
              : "Your profile is up to date."}
          </p>
          <Button
            type="button"
            disabled={!dirty || isPending}
            onClick={handleSave}
            className="h-9 rounded-xl px-4"
          >
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Save profile
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Account & security"
        description="Identity, sign-in and session controls."
        icon={ShieldCheck}
        iconClassName="text-emerald-500 dark:text-emerald-400"
      >
        <div className="flex flex-wrap items-center gap-2">
          {clerkConfigured ? (
            <>
              <ManageAccountButton className="h-9 rounded-xl" />
              <SignOutButton className="h-9 rounded-xl" />
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl"
                disabled
              >
                Manage account
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl"
                disabled
              >
                Sign out
              </Button>
            </>
          )}
        </div>

        <SettingsDivider />

        <div className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground">
          {clerkConfigured ? (
            <>
              Flowbase uses Clerk for secure sign-in. Password, multi-factor
              authentication and connected accounts live inside Clerk&apos;s
              account portal.
            </>
          ) : (
            <>
              Clerk is not configured in this environment, so identity controls
              are read-only. Everything else on this page still saves to your
              local workspace.
            </>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
