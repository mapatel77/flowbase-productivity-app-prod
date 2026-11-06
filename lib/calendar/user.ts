/**
 * Resolves the database user behind the current request.
 *
 * Clerk is optional in this app (see `app/layout.tsx`), and the checked-in
 * environment uses placeholder Clerk keys. To keep the Calendar usable in
 * development *and* production we try Clerk first and fall back to a local
 * demo user when Clerk is unavailable.
 */

import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

export const isClerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

const DEMO_CLERK_ID = "local-demo";
const DEMO_EMAIL = "demo@flowbase.local";
const DEMO_NAME = "Flowbase demo";

async function findUserByClerkId(clerkId: string) {
  const rows = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return rows[0] ?? null;
}

async function findUserByEmail(email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

/** Creates (or returns) the local demo user used when Clerk is not set up. */
async function resolveDemoUser() {
  const existing = await findUserByClerkId(DEMO_CLERK_ID);
  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({ clerkId: DEMO_CLERK_ID, name: DEMO_NAME, email: DEMO_EMAIL })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  return findUserByClerkId(DEMO_CLERK_ID);
}

/**
 * The database identity behind the current request. `name` can be `null` for
 * providers that do not supply one.
 */
export type CurrentUserProfile = {
  id: number;
  name: string | null;
  email: string;
};

/**
 * Returns the profile that owns the workspace, or `null` when there is no user
 * at all (for example when the database is unreachable).
 */
export async function resolveCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  if (isClerkConfigured) {
    try {
      const { userId } = await auth();

      if (userId) {
        const existing = await findUserByClerkId(userId);
        if (existing) {
          return {
            id: existing.id,
            name: existing.name,
            email: existing.email,
          };
        }

        // The user signed in but has not been synced yet — do it now.
        try {
          const client = await clerkClient();
          const clerkUser = await client.users.getUser(userId);
          const email =
            clerkUser.primaryEmailAddress?.emailAddress ??
            clerkUser.emailAddresses?.[0]?.emailAddress;

          if (email) {
            const name =
              [clerkUser.firstName, clerkUser.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() || null;

            const [upserted] = await db
              .insert(users)
              .values({ clerkId: userId, name, email })
              .onConflictDoUpdate({
                target: users.email,
                set: { name },
              })
              .returning();

            if (upserted) {
              return {
                id: upserted.id,
                name: upserted.name,
                email: upserted.email,
              };
            }
          }
        } catch (error) {
          console.error("Failed to sync Clerk user", error);
        }
      }
    } catch (error) {
      console.error("Clerk auth unavailable, using demo user", error);
    }
  }

  try {
    const demo = await resolveDemoUser();
    if (!demo) return null;

    return { id: demo.id, name: demo.name, email: demo.email };
  } catch (error) {
    console.error("Failed to resolve the current user", error);
    return null;
  }
}

/**
 * Returns the `users.id` that owns the workspace, or `null` when there is no
 * user at all (for example when the database is unreachable).
 */
export async function resolveCurrentUserId(): Promise<number | null> {
  return (await resolveCurrentUserProfile())?.id ?? null;
}

/** Used by the category seeding helper to avoid duplicate defaults. */
export async function findUserByEmailAddress(email: string) {
  return findUserByEmail(email);
}
