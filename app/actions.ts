"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function syncUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses?.[0]?.emailAddress;

  const name = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!email) {
    return null;
  }

  await db
    .insert(users)
    .values({ clerkId: userId, name: name || null, email })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: name || null },
    });

  return { clerkId: userId, name: name || null, email };
}
