import { resolveCurrentUserProfile } from "@/lib/calendar/user";
import { ASSEMBLYAI_VOICE_AGENT_WS_URL } from "@/lib/assemblyai/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN_URL = "https://token.assemblyai.com/v1/token";
const REQUEST_TIMEOUT_MS = 10_000;

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
} as const;

type TokenPayload = {
  token?: string;
  expires_in_seconds?: number;
};

/**
 * Mints a short-lived AssemblyAI temporary token for the Voice Agent API.
 *
 * The permanent API key stays on the server; the browser authenticates the
 * WebSocket handshake with the returned token via the `token` query parameter
 * (browsers cannot set headers on a WebSocket handshake).
 *
 * Voice Agent tokens are single-use, so a fresh one is minted for every
 * session.
 */
export async function POST() {
  const profile = await resolveCurrentUserProfile();
  if (!profile) {
    return Response.json({ error: "Not signed in." }, { status: 401, headers: noStoreHeaders });
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Voice Assistant is not configured yet. Add ASSEMBLYAI_API_KEY to your environment and restart the app.",
      },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const tokenPayload = {
    product: "speech_to_speech",
    expires_in_seconds: 300,
    max_session_duration_seconds: 3600,
    access: {
      speech_to_speech: { enabled: true },
      tts: { enabled: false },
      streaming: { enabled: false },
      llm_gateway: { enabled: false },
    },
  };

  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenPayload),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("AssemblyAI token request failed", error);
    return Response.json(
      {
        error: "Could not reach AssemblyAI. Check your connection and try again.",
      },
      { status: 502, headers: noStoreHeaders },
    );
  }

  const payload = (await response.json().catch(() => null)) as TokenPayload | null;

  if (!response.ok || !payload?.token) {
    const errorText = await response.text().catch(() => "");
    console.error(
      "AssemblyAI token endpoint returned an error",
      response.status,
      errorText,
    );

    const rejected =
      response.status === 401 || response.status === 403 || response.status === 404;

    const message = rejected
      ? "Your AssemblyAI account cannot use the Voice Agent API. Check that ASSEMBLYAI_API_KEY is valid and that Voice Agents are enabled for your account."
      : response.status === 429
        ? "Voice Assistant is busy right now. Wait a moment and try again."
        : `Voice Assistant could not start (${response.status}). ${errorText || "Try again in a moment."}`;

    return Response.json(
      { error: message, unavailable: rejected },
      { status: rejected ? 403 : 502, headers: noStoreHeaders },
    );
  }

  return Response.json(
    {
      token: payload.token,
      expiresInSeconds: payload.expires_in_seconds ?? tokenPayload.expires_in_seconds,
      product: tokenPayload.product,
      wsUrl: ASSEMBLYAI_VOICE_AGENT_WS_URL,
      unavailable: false,
    },
    { headers: noStoreHeaders },
  );
}
