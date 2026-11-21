"use client";

import { SubscriptionDetailsButton } from "@clerk/nextjs/experimental";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Opens Clerk's hosted subscription drawer for the signed-in user. */
export function ManageSubscriptionButton({
  className,
}: {
  className?: string;
}) {
  return (
    <SubscriptionDetailsButton>
      <Button type="button" variant="outline" className={className}>
        <CreditCard />
        Manage subscription
      </Button>
    </SubscriptionDetailsButton>
  );
}
