"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { syncUser } from "@/app/actions";

export function UserSync() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  useEffect(() => {
    if (!isLoaded || !userId) return;

    syncUser().catch((error) => {
      console.error("Failed to save user to the database", error);
    });
  }, [userId, isLoaded]);

  return null;
}
