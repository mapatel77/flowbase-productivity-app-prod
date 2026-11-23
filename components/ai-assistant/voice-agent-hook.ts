"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ASSEMBLYAI_VOICE_AGENT_SAMPLE_RATE } from "@/lib/assemblyai/config";
import { PcmPlayer } from "./pcm-player";

export type VoiceConversationState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export type VoiceConversationEvents = {
  /**
   * User speech. When `isFinal` is false the text is the transcript so far
   * (it supersedes the previous partial and must replace, not append).
   */
  onUserTranscript?: (text: string, isFinal: boolean) => void;
  /**
   * Agent speech. When `isFinal` is false the text is an incremental fragment
   * that should be appended.
   */
  onAgentTranscript?: (text: string, isFinal: boolean) => void;
  onStateChange?: (state: VoiceConversationState) => void;
  onError?: (error: string) => void;
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
};

type VoiceAgentConfig = {
  systemPrompt: string;
  tools: Array<Record<string, unknown>>;
  greeting?: string;
  voice?: string;
};

type TokenResponse = {
  token?: string;
  wsUrl?: string;
  error?: string;
  unavailable?: boolean;
};

type PendingToolCall = {
  callId: string;
  name: string;
  arguments: Record<string, unknown>;
  promise: Promise<unknown>;
};

/** Encodes signed 16-bit PCM samples as a base64 string. */
export function int16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(
    samples.buffer,
    samples.byteOffset,
    samples.byteLength,
  );
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)),
    );
  }
  return btoa(binary);
}

/**
 * Drives a full voice-to-voice conversation with the AssemblyAI Voice Agent
 * API.
 *
 * Speech-to-text, the language model and text-to-speech all travel over a
 * single WebSocket, which keeps latency low and gives us native barge-in.
 * Tool calls are resolved client-side: the browser receives a `tool.call`,
 * runs the matching server action through the authenticated API route and
 * replies with a `tool.result`.
 */
export function useVoiceConversation(events?: VoiceConversationEvents) {
  const [state, setState] = useState<VoiceConversationState>("idle");
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef<VoiceConversationState>("idle");
  const eventsRef = useRef<VoiceConversationEvents | undefined>(events);
  eventsRef.current = events;

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playerRef = useRef<PcmPlayer | null>(null);
  const pendingToolsRef = useRef<PendingToolCall[]>([]);
  const activeRef = useRef(false);
  const resolveReadyRef = useRef<(() => void) | null>(null);
  const readyTimerRef = useRef<number | null>(null);

  const setAgentState = useCallback((next: VoiceConversationState) => {
    if (stateRef.current === next) return;
    console.log("[VoiceAgent] State change:", stateRef.current, "->", next);
    stateRef.current = next;
    setState(next);
    eventsRef.current?.onStateChange?.(next);
  }, []);

  const emitError = useCallback(
    (message: string) => {
      console.error("[VoiceAgent] Error:", message);
      setError(message);
      eventsRef.current?.onError?.(message);
      setAgentState("error");
    },
    [setAgentState],
  );

  /* ── Tool execution ─────────────────────────────────────────────────────── */

  const runVoiceTool = useCallback(
    async (name: string, args: Record<string, unknown>): Promise<unknown> => {
      try {
        const response = await fetch("/api/ai-assistant/voice-tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, arguments: args }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Tool execution failed");
        }
        eventsRef.current?.onToolCall?.(name, args);
        return data.result;
      } catch (toolError) {
        console.error("[VoiceAgent] Tool failed:", name, toolError);
        eventsRef.current?.onToolCall?.(name, args);
        return {
          error:
            toolError instanceof Error
              ? toolError.message
              : "Tool execution failed",
        };
      }
    },
    [],
  );

  /* ── Audio capture ──────────────────────────────────────────────────────── */

  const startMicrophone = useCallback(
    async (
      targetSampleRate: number,
      onChunk: (samples: Int16Array) => void,
    ) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
        video: false,
      });
      streamRef.current = stream;

      const context = new AudioContext();
      audioContextRef.current = context;
      if (context.state === "suspended") {
        await context.resume();
      }

      await context.audioWorklet.addModule("/audio-worklets/pcm-resampler.js");

      const source = context.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(context, "pcm-resampler", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: {
          targetSampleRate,
          chunkMs: 50,
        },
      });
      workletRef.current = worklet;

      // A muted sink keeps the worklet pulled by the audio graph without
      // echoing the microphone back to the speakers.
      const silentGain = context.createGain();
      silentGain.gain.value = 0;
      source.connect(worklet);
      worklet.connect(silentGain);
      silentGain.connect(context.destination);

      worklet.port.onmessage = (event: MessageEvent) => {
        const samples = event.data as Int16Array;
        if (!samples || samples.length === 0) return;
        onChunk(samples);
      };
    },
    [],
  );

  /* ── Teardown ───────────────────────────────────────────────────────────── */

  const teardown = useCallback(async () => {
    activeRef.current = false;
    pendingToolsRef.current = [];

    if (readyTimerRef.current !== null) {
      window.clearTimeout(readyTimerRef.current);
      readyTimerRef.current = null;
    }

    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "session.end" }));
      } catch {
        // Socket already closing.
      }
      try {
        ws.close(1000, "client ended session");
      } catch {
        // Already closed.
      }
    }

    if (workletRef.current) {
      try {
        workletRef.current.port.postMessage({ type: "close" });
        workletRef.current.disconnect();
      } catch {
        // Already disconnected.
      }
      workletRef.current = null;
    }

    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());

    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context) {
      try {
        await context.close();
      } catch {
        // Already closed.
      }
    }

    const player = playerRef.current;
    playerRef.current = null;
    if (player) {
      await player.close();
    }
  }, []);

  /* ── Voice Agent events ─────────────────────────────────────────────────── */

  /** Handles a single server event from the Voice Agent WebSocket. */
  const handleAgentEvent = useCallback(
    (payload: Record<string, unknown>, ws: WebSocket) => {
      const type = String(payload.type ?? "");

      switch (type) {
        case "session.ready": {
          if (readyTimerRef.current !== null) {
            window.clearTimeout(readyTimerRef.current);
            readyTimerRef.current = null;
          }
          resolveReadyRef.current?.();
          resolveReadyRef.current = null;
          break;
        }
        case "input.speech.started": {
          // Barge-in: stop the current reply so the user can talk over it.
          playerRef.current?.stop();
          setAgentState("listening");
          break;
        }
        case "input.speech.stopped": {
          setAgentState("thinking");
          break;
        }
        case "transcript.user": {
          const text = String(payload.text ?? "");
          if (text.trim()) {
            eventsRef.current?.onUserTranscript?.(text, true);
          }
          break;
        }
        case "transcript.user.delta": {
          // The Voice Agent sends the full transcript so far, so this
          // supersedes the previous partial rather than extending it.
          const text = String(payload.text ?? "");
          if (text) {
            eventsRef.current?.onUserTranscript?.(text, false);
          }
          break;
        }
        case "reply.started": {
          setAgentState("speaking");
          break;
        }
        case "reply.audio": {
          const data = typeof payload.data === "string" ? payload.data : "";
          if (data) {
            playerRef.current?.enqueueBase64(data);
            setAgentState("speaking");
          }
          break;
        }
        case "transcript.agent.delta": {
          const delta = String(payload.delta ?? "");
          if (delta) {
            eventsRef.current?.onAgentTranscript?.(delta, false);
          }
          break;
        }
        case "transcript.agent": {
          const text = String(payload.text ?? "").trim();
          if (text) {
            eventsRef.current?.onAgentTranscript?.(text, true);
          }
          break;
        }
        case "tool.call": {
          const callId = String(payload.call_id ?? "");
          const name = String(payload.name ?? "");
          const args =
            payload.arguments && typeof payload.arguments === "object"
              ? (payload.arguments as Record<string, unknown>)
              : {};

          if (!callId || !name) break;

          const promise = runVoiceTool(name, args);
          pendingToolsRef.current.push({
            callId,
            name,
            arguments: args,
            promise,
          });
          break;
        }
        case "reply.done": {
          const status = String(payload.status ?? "completed");
          const pending = pendingToolsRef.current;
          pendingToolsRef.current = [];

          if (status === "interrupted") {
            // An interrupted turn drops any tool result that was queued.
            playerRef.current?.stop();
            setAgentState("listening");
            break;
          }

          if (pending.length > 0) {
            // The tool result may only be sent once `reply.done` is the
            // latest event, otherwise the agent ignores it.
            void Promise.all(
              pending.map(async (call) => {
                const result = await call.promise;
                if (ws.readyState !== WebSocket.OPEN) return;
                ws.send(
                  JSON.stringify({
                    type: "tool.result",
                    call_id: call.callId,
                    result:
                      typeof result === "string"
                        ? result
                        : JSON.stringify(result ?? {}),
                    is_error: false,
                  }),
                );
              }),
            ).then(() => {
              setAgentState("thinking");
            });
            break;
          }

          // The server reports `reply.done` once the audio bytes were sent;
          // wait for the local playback queue to drain before we say we are
          // listening again.
          void playerRef.current?.whenIdle().then(() => {
            if (stateRef.current === "speaking") {
              setAgentState("listening");
            }
          });
          break;
        }
        case "session.error": {
          const message = String(
            payload.message ?? "The voice assistant hit an error.",
          );
          const code = String(payload.code ?? "");
          emitError(code ? `${message} (${code})` : message);
          break;
        }
        case "session.ended": {
          void teardown();
          setAgentState("idle");
          break;
        }
        default:
          break;
      }
    },
    [emitError, runVoiceTool, setAgentState, teardown],
  );

  /* ── Session start ──────────────────────────────────────────────────────── */

  const mintToken = useCallback(async (): Promise<TokenResponse> => {
    const response = await fetch("/api/assemblyai/voice-token", {
      method: "POST",
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as TokenResponse | null;
    if (!response.ok) {
      throw new Error(data?.error || "Could not start the voice assistant.");
    }
    if (!data?.token || !data?.wsUrl) {
      throw new Error("The voice assistant token was missing.");
    }
    return data;
  }, []);

  const fetchVoiceConfig = useCallback(async (): Promise<VoiceAgentConfig> => {
    const response = await fetch("/api/ai-assistant/voice-config", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Could not load the voice assistant configuration.");
    }
    return (await response.json()) as VoiceAgentConfig;
  }, []);

  const startAgentSession = useCallback(
    async (token: string, wsUrl: string, config: VoiceAgentConfig) => {
      const url = `${wsUrl}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      const player = new PcmPlayer(ASSEMBLYAI_VOICE_AGENT_SAMPLE_RATE);
      playerRef.current = player;

      const ready = new Promise<void>((resolve, reject) => {
        resolveReadyRef.current = resolve;
        readyTimerRef.current = window.setTimeout(() => {
          readyTimerRef.current = null;
          reject(new Error("The voice assistant did not respond in time."));
        }, 15_000);
        ws.addEventListener(
          "error",
          () => {
            if (readyTimerRef.current !== null) {
              window.clearTimeout(readyTimerRef.current);
              readyTimerRef.current = null;
            }
            reject(new Error("Could not connect to the voice assistant."));
          },
          { once: true },
        );
      });

      ws.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(event.data) as Record<string, unknown>;
        } catch {
          return;
        }
        handleAgentEvent(payload, ws);
      });

      ws.addEventListener("open", () => {
        console.log("[VoiceAgent] WebSocket connected");
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              system_prompt: config.systemPrompt,
              greeting: config.greeting,
              tools: config.tools,
              output: {
                voice: config.voice ?? "anna",
              },
            },
          }),
        );
      });

      await ready;
      await player.resume();

      await startMicrophone(
        ASSEMBLYAI_VOICE_AGENT_SAMPLE_RATE,
        (samples) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(
            JSON.stringify({
              type: "input.audio",
              audio: int16ToBase64(samples),
            }),
          );
        },
      );

      setAgentState("listening");
    },
    [handleAgentEvent, setAgentState, startMicrophone],
  );

  /* ── Public API ─────────────────────────────────────────────────────────── */

  const start = useCallback(async () => {
    if (activeRef.current) return;
    activeRef.current = true;
    setError(null);
    setAgentState("connecting");

    try {
      const [tokenResponse, config] = await Promise.all([
        mintToken(),
        fetchVoiceConfig(),
      ]);

      await startAgentSession(
        tokenResponse.token!,
        tokenResponse.wsUrl!,
        config,
      );
    } catch (startError) {
      console.error("[VoiceAgent] Session start failed:", startError);

      await teardown();
      activeRef.current = false;

      emitError(
        startError instanceof Error
          ? startError.message
          : "Could not start the voice assistant.",
      );
    }
  }, [
    emitError,
    fetchVoiceConfig,
    mintToken,
    setAgentState,
    startAgentSession,
    teardown,
  ]);

  const stop = useCallback(async () => {
    if (!activeRef.current) return;
    await teardown();
    setAgentState("idle");
  }, [setAgentState, teardown]);

  const toggle = useCallback(() => {
    if (activeRef.current) {
      void stop();
    } else {
      void start();
    }
  }, [start, stop]);

  useEffect(() => {
    const handlePageHide = () => {
      if (!activeRef.current) return;
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "session.end" }));
        } catch {
          // Ignore.
        }
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      void teardown();
    };
  }, [teardown]);

  return {
    state,
    error,
    isActive:
      state === "connecting" ||
      state === "listening" ||
      state === "thinking" ||
      state === "speaking",
    isListening: state === "listening",
    isSpeaking: state === "speaking",
    start,
    stop,
    toggle,
  };
}
