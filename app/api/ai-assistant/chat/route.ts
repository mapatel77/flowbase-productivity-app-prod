import { resolveCurrentUserProfile } from "@/lib/calendar/user";
import { aiChat } from "@/app/ai-assistant/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const profile = await resolveCurrentUserProfile();
    if (!profile) {
      return Response.json({ ok: false, error: "Not signed in." }, { status: 401 });
    }

    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ ok: false, error: "Invalid messages format." }, { status: 400 });
    }

    const result = await aiChat({ messages });

    return Response.json(result);
  } catch (error) {
    console.error("AI Assistant chat API error:", error);
    return Response.json(
      { ok: false, error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}