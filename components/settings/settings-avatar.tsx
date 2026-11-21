"use client";

import { useUser } from "@clerk/nextjs";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function initialsFor(name: string | null, email: string) {
  const source = name?.trim() || email.split("@")[0] || "Flowbase";
  const parts = source.split(/[\s._-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function AvatarShell({
  name,
  email,
  imageUrl,
  className,
  fallbackClassName,
}: {
  name: string | null;
  email: string;
  imageUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar
      className={cn(
        "size-16 after:border-white/40 after:mix-blend-normal sm:size-20",
        className,
      )}
    >
      {imageUrl ? <AvatarImage src={imageUrl} alt={name ?? email} /> : null}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br from-orange-400 via-rose-400 to-violet-400 text-xl font-semibold text-white",
          fallbackClassName,
        )}
      >
        {initialsFor(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}

function ClerkAvatar({
  name,
  email,
  className,
  fallbackClassName,
}: {
  name: string | null;
  email: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const { user } = useUser();

  return (
    <AvatarShell
      name={name}
      email={email}
      imageUrl={user?.imageUrl}
      className={className}
      fallbackClassName={fallbackClassName}
    />
  );
}

/**
 * Shows the Clerk profile photo when Clerk is configured and falls back to
 * warm initials everywhere else, including the local demo workspace.
 */
export function SettingsAvatar({
  name,
  email,
  clerkConfigured,
  className,
  fallbackClassName,
}: {
  name: string | null;
  email: string;
  clerkConfigured: boolean;
  className?: string;
  fallbackClassName?: string;
}) {
  if (clerkConfigured) {
    return (
      <ClerkAvatar
        name={name}
        email={email}
        className={className}
        fallbackClassName={fallbackClassName}
      />
    );
  }

  return (
    <AvatarShell
      name={name}
      email={email}
      className={className}
      fallbackClassName={fallbackClassName}
    />
  );
}
