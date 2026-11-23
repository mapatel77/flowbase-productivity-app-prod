import { resolveCurrentUserProfile } from "@/lib/calendar/user";
import {
  VOICE_AGENT_SYSTEM_PROMPT,
  VOICE_AGENT_TOOLS,
} from "@/app/ai-assistant/tool-definitions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
} as const;

/**
 * Returns the inline Voice Agent session configuration (system prompt and
 * client-side tool definitions) for the AssemblyAI Voice Agent API.
 *
 * The tool definitions live in the server action module because they must stay
 * in sync with the Zod schemas that validate the tool arguments, so the
 * browser fetches them here instead of importing them directly.
 */
export async function GET() {
  const profile = await resolveCurrentUserProfile();
  if (!profile) {
    return Response.json(
      { error: "Not signed in." },
      { status: 401, headers: noStoreHeaders },
    );
  }

  return Response.json(
    {
      systemPrompt: VOICE_AGENT_SYSTEM_PROMPT,
      tools: VOICE_AGENT_TOOLS,
      /**
       * No greeting: the agent stays quiet until the user speaks, so an
       * interrupted greeting never lands in the chat as a partial message.
       */
      greeting: undefined,
      voice: "anna",
    },
    { headers: noStoreHeaders },
  );
}
