import { resolveCurrentUserProfile } from "@/lib/calendar/user";
import { executeVoiceTool } from "@/app/ai-assistant/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
} as const;

/**
 * Executes one tool requested by the AssemblyAI Voice Agent.
 *
 * The Voice Agent API supports client-side function tools: the browser receives
 * a `tool.call` event, runs the matching logic, and sends the result back over
 * the same WebSocket. This route is the authenticated bridge between the
 * browser and the existing AI Assistant server actions, so the signed-in
 * user's Clerk session is used for every database write.
 */
export async function POST(request: Request) {
  try {
    const profile = await resolveCurrentUserProfile();
    if (!profile) {
      return Response.json(
        { ok: false, error: "Not signed in." },
        { status: 401, headers: noStoreHeaders },
      );
    }

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name : "";
    if (!name) {
      return Response.json(
        { ok: false, error: "A tool name is required." },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const argumentsValue =
      body?.arguments !== undefined && body?.arguments !== null
        ? body.arguments
        : {};

    const result = await executeVoiceTool({ name, arguments: argumentsValue });

    if (!result.ok) {
      return Response.json(
        { ok: false, error: result.error },
        { status: 500, headers: noStoreHeaders },
      );
    }

    return Response.json(
      { ok: true, result: result.data.result },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    console.error("Voice tool execution error:", error);
    return Response.json(
      { ok: false, error: "Tool execution failed." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
