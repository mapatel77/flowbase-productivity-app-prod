"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ASSEMBLYAI_STREAMING_WS_URL,
  ASSEMBLYAI_TOKEN_ENDPOINT,
  DEFAULT_ASSEMBLYAI_SPEECH_MODEL,
  type AssemblyAITokenResponse,
} from "@/lib/assemblyai/config";

export type AssemblyAIStreamingStatus =
  | "idle"
  | "connecting"
  | "recording"
  | "stopping"
  | "error";

type UseAssemblyAIStreamingOptions = {
  /** Called once per finalized turn. Partial transcripts are never inserted. */
  onFinalTranscript: (text: string) => void;
  /** Called with a user-facing message when the session fails. */
  onError?: (message: string) => void;
};

type StreamingServerMessage = {
  type?: string;
  turn_order?: number;
  end_of_turn?: boolean;
  transcript?: string;
  error?: string;
  message?: string;
};

const STOP_FLUSH_DELAY_MS = 120;
const TERMINATE_TIMEOUT_MS = 3_000;

function microphoneErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "Microphone access was denied. Allow microphone access in your browser and try again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No microphone was found. Connect a microphone and try again.";
    case "NotReadableError":
    case "TrackStartError":
      return "The microphone is in use by another app. Close it and try again.";
    default:
      return "Could not start the microphone. Try again.";
  }
}

/**
 * Reusable AssemblyAI Universal Streaming speech-to-text session.
 *
 * The hook owns the microphone, the PCM worklet, and the WebSocket. It inserts
 * only finalized turns; partial transcripts stay in `partialTranscript` so the
 * caller can show a live preview without duplicating text in the editor.
 */
export function useAssemblyAIStreaming({
  onFinalTranscript,
  onError,
}: UseAssemblyAIStreamingOptions) {
  const [status, setStatus] = useState<AssemblyAIStreamingStatus>("idle");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const statusRef = useRef<AssemblyAIStreamingStatus>("idle");
  const mountedRef = useRef(true);
  const sessionRef = useRef(0);
  const audioConnectedRef = useRef(false);
  const lastFinalTurnRef = useRef(-1);
  const lastFinalTextRef = useRef("");

  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const terminateTimerRef = useRef<number | null>(null);

  const finalRef = useRef(onFinalTranscript);
  const errorRef = useRef(onError);
  finalRef.current = onFinalTranscript;
  errorRef.current = onError;

  const applyStatus = useCallback((next: AssemblyAIStreamingStatus) => {
    statusRef.current = next;
    if (mountedRef.current) setStatus(next);
  }, []);

  const clearTerminateTimer = useCallback(() => {
    if (terminateTimerRef.current === null) return;
    window.clearTimeout(terminateTimerRef.current);
    terminateTimerRef.current = null;
  }, []);

  const disposeAudio = useCallback(() => {
    audioConnectedRef.current = false;

    try {
      sourceRef.current?.disconnect();
    } catch {
      // The node may already be disconnected.
    }
    sourceRef.current = null;

    try {
      workletRef.current?.disconnect();
    } catch {
      // The node may already be disconnected.
    }
    workletRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close().catch(() => {
        // Closing is best-effort.
      });
    }
  }, []);

  const closeSocket = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (!socket) return;

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    try {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    } catch {
      // Closing is best-effort.
    }
  }, []);

  const finishSession = useCallback(() => {
    clearTerminateTimer();
    sessionRef.current += 1;
    closeSocket();
    disposeAudio();
    setPartialTranscript("");
    setError(null);
    applyStatus("idle");
  }, [applyStatus, clearTerminateTimer, closeSocket, disposeAudio]);

  const failSession = useCallback(
    (message: string) => {
      clearTerminateTimer();
      sessionRef.current += 1;
      closeSocket();
      disposeAudio();
      setPartialTranscript("");
      setError(message);
      applyStatus("error");
      if (mountedRef.current) errorRef.current?.(message);
    },
    [applyStatus, clearTerminateTimer, closeSocket, disposeAudio],
  );

  const start = useCallback(async () => {
    const currentStatus = statusRef.current;
    if (
      currentStatus === "connecting" ||
      currentStatus === "recording" ||
      currentStatus === "stopping"
    ) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      failSession(
        "Microphone access is not available in this browser. Try a modern browser or a secure connection.",
      );
      return;
    }

    if (typeof AudioContext === "undefined") {
      failSession(
        "Live transcription is not supported in this browser. Try a modern browser.",
      );
      return;
    }

    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    lastFinalTurnRef.current = -1;
    lastFinalTextRef.current = "";

    setError(null);
    setPartialTranscript("");
    applyStatus("connecting");

    // Create and resume the context inside the click handler so browser autoplay
    // policies do not leave it suspended after the async token/microphone steps.
    try {
      const audioContext = new AudioContext();
      contextRef.current = audioContext;
      void audioContext.resume().catch(() => {
        // The context is resumed again when AssemblyAI sends Begin.
      });
    } catch (contextError) {
      console.error("Could not create an audio context", contextError);
      failSession("Live transcription could not start in this browser.");
      return;
    }

    // Ask for the microphone directly inside the click handler.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (microphoneError) {
      if (sessionRef.current === sessionId) {
        failSession(microphoneErrorMessage(microphoneError));
      }
      return;
    }

    if (sessionRef.current !== sessionId) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;

    let tokenData: AssemblyAITokenResponse;
    try {
      const response = await fetch(ASSEMBLYAI_TOKEN_ENDPOINT, {
        method: "POST",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const payload = (await response.json().catch(() => null)) as
        | (Partial<AssemblyAITokenResponse> & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ?? "Voice notes could not start. Try again.",
        );
      }
      if (!payload?.token) {
        throw new Error("Voice notes could not start. Try again.");
      }

      tokenData = {
        token: payload.token,
        expiresInSeconds: payload.expiresInSeconds ?? 60,
        speechModel:
          payload.speechModel || DEFAULT_ASSEMBLYAI_SPEECH_MODEL,
      };
    } catch (tokenError) {
      if (sessionRef.current === sessionId) {
        failSession(
          tokenError instanceof Error
            ? tokenError.message
            : "Voice notes could not start. Try again.",
        );
      }
      return;
    }

    if (sessionRef.current !== sessionId) {
      disposeAudio();
      return;
    }

    try {
      const context = contextRef.current;
      if (!context || sessionRef.current !== sessionId) {
        disposeAudio();
        return;
      }

      await context.audioWorklet.addModule("/assemblyai/pcm-worklet.js");
      if (sessionRef.current !== sessionId) {
        disposeAudio();
        return;
      }

      const source = context.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(context, "pcm16-streamer", {
        processorOptions: { chunkDurationMs: 100 },
      });

      // The processor only writes PCM to the port; its audio output is silence.
      worklet.connect(context.destination);

      sourceRef.current = source;
      workletRef.current = worklet;

      worklet.port.onmessage = (event) => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        if (event.data instanceof ArrayBuffer) socket.send(event.data);
      };
    } catch (audioError) {
      console.error("Could not set up microphone audio", audioError);
      if (sessionRef.current === sessionId) {
        failSession(
          "Live transcription could not start. Check your microphone and try again.",
        );
      }
      return;
    }

    const params = new URLSearchParams({
      token: tokenData.token,
      sample_rate: String(
        Math.round(contextRef.current?.sampleRate ?? 48_000),
      ),
      encoding: "pcm_s16le",
      speech_model: tokenData.speechModel,
      format_turns: "true",
      include_partial_turns: "true",
    });

    let socket: WebSocket;
    try {
      socket = new WebSocket(
        `${ASSEMBLYAI_STREAMING_WS_URL}?${params.toString()}`,
      );
    } catch (socketError) {
      console.error("Could not open AssemblyAI socket", socketError);
      failSession("Live transcription could not connect. Try again.");
      return;
    }

    socket.binaryType = "arraybuffer";
    socketRef.current = socket;

    socket.onmessage = (event) => {
      if (sessionRef.current !== sessionId) return;

      let message: StreamingServerMessage;
      try {
        message = JSON.parse(String(event.data)) as StreamingServerMessage;
      } catch {
        return;
      }

      if (message.type === "Begin") {
        if (statusRef.current !== "connecting" || audioConnectedRef.current) {
          return;
        }

        const sourceNode = sourceRef.current;
        const workletNode = workletRef.current;
        if (!sourceNode || !workletNode) return;

        try {
          sourceNode.connect(workletNode);
          audioConnectedRef.current = true;
          void contextRef.current?.resume();
        } catch (connectError) {
          console.error("Could not connect audio to the worklet", connectError);
          failSession("Live transcription could not start. Try again.");
          return;
        }

        applyStatus("recording");
        return;
      }

      if (message.type === "Turn") {
        const order =
          typeof message.turn_order === "number" ? message.turn_order : -1;
        const transcript = (message.transcript ?? "").trim();

        if (message.end_of_turn) {
          setPartialTranscript("");

          if (order >= 0) {
            if (order <= lastFinalTurnRef.current) return;
            lastFinalTurnRef.current = order;
          } else if (transcript && transcript === lastFinalTextRef.current) {
            return;
          }

          if (!transcript) return;
          lastFinalTextRef.current = transcript;

          try {
            finalRef.current(transcript);
          } catch (callbackError) {
            console.error("Could not insert transcript", callbackError);
          }
          return;
        }

        if (order >= 0 && order <= lastFinalTurnRef.current) return;
        setPartialTranscript(transcript);
        return;
      }

      if (message.type === "Termination") {
        finishSession();
        return;
      }

      if (message.type === "Error") {
        failSession(
          message.error ??
            message.message ??
            "Live transcription stopped unexpectedly. Try again.",
        );
      }
    };

    socket.onerror = () => {
      if (sessionRef.current !== sessionId) return;
      if (statusRef.current === "stopping") return;
      failSession(
        "The live transcription connection failed. Check your connection and try again.",
      );
    };

    socket.onclose = () => {
      if (sessionRef.current !== sessionId) return;
      if (statusRef.current === "stopping") {
        finishSession();
        return;
      }
      failSession(
        "The live transcription connection closed. Your note is saved.",
      );
    };
  }, [applyStatus, disposeAudio, failSession, finishSession]);

  const stop = useCallback(async () => {
    const currentStatus = statusRef.current;
    if (currentStatus === "idle" || currentStatus === "error") return;

    if (currentStatus === "connecting") {
      // Cancel a start that is still waiting for permission, a token, or audio.
      sessionRef.current += 1;
      clearTerminateTimer();
      closeSocket();
      disposeAudio();
      setPartialTranscript("");
      setError(null);
      applyStatus("idle");
      return;
    }

    if (currentStatus !== "recording") return;

    const sessionId = sessionRef.current;
    applyStatus("stopping");
    setPartialTranscript("");

    // Flush the tail of the current 100 ms PCM buffer before tearing audio down.
    try {
      workletRef.current?.port.postMessage({ type: "flush" });
    } catch {
      // The worklet may already be gone.
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, STOP_FLUSH_DELAY_MS);
    });

    if (
      sessionRef.current !== sessionId ||
      statusRef.current !== "stopping"
    ) {
      return;
    }

    disposeAudio();

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      finishSession();
      return;
    }

    try {
      socket.send(JSON.stringify({ type: "Terminate" }));
    } catch {
      finishSession();
      return;
    }

    // Terminate finalizes the open turn. Give the last final a moment to arrive.
    terminateTimerRef.current = window.setTimeout(() => {
      terminateTimerRef.current = null;
      if (sessionRef.current !== sessionId) return;
      finishSession();
    }, TERMINATE_TIMEOUT_MS);
  }, [
    applyStatus,
    clearTerminateTimer,
    closeSocket,
    disposeAudio,
    finishSession,
  ]);

  const toggle = useCallback(async () => {
    if (
      statusRef.current === "recording" ||
      statusRef.current === "connecting" ||
      statusRef.current === "stopping"
    ) {
      await stop();
      return;
    }

    await start();
  }, [start, stop]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      sessionRef.current += 1;
      clearTerminateTimer();

      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;

        try {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "Terminate" }));
          }
          socket.close();
        } catch {
          // Closing is best-effort.
        }
      }

      disposeAudio();
    };
  }, [clearTerminateTimer, disposeAudio]);

  return {
    status,
    isRecording: status === "recording",
    isActive:
      status === "connecting" ||
      status === "recording" ||
      status === "stopping",
    partialTranscript,
    error,
    start,
    stop,
    toggle,
  };
}
