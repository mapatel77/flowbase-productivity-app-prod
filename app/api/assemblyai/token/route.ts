import { DEFAULT_ASSEMBLYAI_SPEECH_MODEL } from "@/lib/assemblyai/config";
import { resolveCurrentUserProfile } from "@/lib/calendar/user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN_URL = "https://token.assemblyai.com/v1/token";
const TOKEN_TTL_SECONDS = 60;
const REQUEST_TIMEOUT_MS = 10_000;

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
} as const;

type TokenPayload = {
  token?: string;
  expires_in_seconds?: number;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

/**
 * Mints a short-lived AssemblyAI streaming token. The permanent API key stays
 * on the server; browsers authenticate the WebSocket with this token instead.
 */
export async function POST() {
  const profile = await resolveCurrentUserProfile();
  if (!profile) {
    return json({ error: "Not signed in." }, 401);
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY?.trim();
  if (!apiKey) {
    return json(
      {
        error:
          "Voice notes are not configured yet. Add ASSEMBLYAI_API_KEY to your environment and restart the app.",
      },
      503,
    );
  }

  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product: "streaming",
        expires_in_seconds: TOKEN_TTL_SECONDS,
        access: {
          tts: { enabled: false },
          speech_to_speech: { enabled: false },
          llm_gateway: { enabled: false },
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("AssemblyAI token request failed", error);
    return json(
      {
        error:
          "Could not reach AssemblyAI. Check your connection and try again.",
      },
      502,
    );
  }

  const payload = (await response
    .json()
    .catch(() => null)) as TokenPayload | null;

  if (!response.ok || !payload?.token) {
    console.error(
      "AssemblyAI token endpoint returned an error",
      response.status,
    );

    const message =
      response.status === 401 || response.status === 403
        ? "AssemblyAI rejected the API key. Check that ASSEMBLYAI_API_KEY is valid."
        : response.status === 429
          ? "Voice notes are busy right now. Wait a moment and try again."
          : "Voice notes could not start. Try again in a moment.";

    return json({ error: message }, 502);
  }

  return json({
    token: payload.token,
    expiresInSeconds: payload.expires_in_seconds ?? TOKEN_TTL_SECONDS,
    speechModel:
      process.env.ASSEMBLYAI_SPEECH_MODEL?.trim() ||
      DEFAULT_ASSEMBLYAI_SPEECH_MODEL,
  });
}
