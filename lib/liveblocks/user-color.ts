import { COLOR_TOKENS, type ColorToken } from "@/lib/calendar/colors";

/**
 * Deterministic avatar colours keep the same person recognisable across
 * presence, comments and the collaboration panel without storing a colour in
 * the database.
 */
export function getUserColor(seed: string): ColorToken {
  let hash = 0;

  for (const character of seed.trim().toLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return COLOR_TOKENS[hash % COLOR_TOKENS.length] ?? "sky";
}

/** A friendly display name for an email-only pending invite. */
export function getUserDisplayName(
  name: string | null | undefined,
  email: string,
): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;

  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!localPart) return email;

  return localPart.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** One or two letters for compact avatar fallbacks. */
export function getUserInitials(
  name: string | null | undefined,
  email: string,
): string {
  const displayName = getUserDisplayName(name, email);
  const words = displayName.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
  }

  return (words[0]?.slice(0, 2) || email.slice(0, 2)).toUpperCase();
}
