/** Client-safe AssemblyAI settings shared by the API route and the hook. */

export const DEFAULT_ASSEMBLYAI_SPEECH_MODEL = "universal-streaming-english";

export const ASSEMBLYAI_TOKEN_ENDPOINT = "/api/assemblyai/token";

export const ASSEMBLYAI_STREAMING_WS_URL =
  "wss://streaming.assemblyai.com/v3/ws";

/** Native AssemblyAI Voice Agent API (STT + LLM + TTS over one WebSocket). */
export const ASSEMBLYAI_VOICE_AGENT_WS_URL =
  "wss://agents.assemblyai.com/v1/ws";

/** Voice Agent API expects PCM16 mono at 24 kHz in both directions. */
export const ASSEMBLYAI_VOICE_AGENT_SAMPLE_RATE = 24000;

export type AssemblyAITokenResponse = {
  token: string;
  expiresInSeconds: number;
  speechModel: string;
};
