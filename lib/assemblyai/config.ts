/** Client-safe AssemblyAI settings shared by the API route and the hook. */

export const DEFAULT_ASSEMBLYAI_SPEECH_MODEL = "universal-streaming-english";

export const ASSEMBLYAI_TOKEN_ENDPOINT = "/api/assemblyai/token";

export const ASSEMBLYAI_STREAMING_WS_URL =
  "wss://streaming.assemblyai.com/v3/ws";

export type AssemblyAITokenResponse = {
  token: string;
  expiresInSeconds: number;
  speechModel: string;
};
