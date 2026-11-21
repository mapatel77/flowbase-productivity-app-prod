"use client";

import { useClerk } from "@clerk/nextjs";
import { ExternalLink, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ManageAccountButton({
  className,
}: {
  className?: string;
}) {
  const clerk = useClerk();

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() => clerk.openUserProfile()}
    >
      <ExternalLink />
      Manage account
    </Button>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  const clerk = useClerk();

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() => void clerk.signOut({ redirectUrl: "/" })}
    >
      <LogOut />
      Sign out
    </Button>
  );
}
