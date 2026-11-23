"use client";

/**
 * Plays back base64-encoded PCM16 mono audio (for example the `reply.audio`
 * frames from the AssemblyAI Voice Agent API or the Streaming TTS API).
 *
 * Chunks are queued and scheduled back-to-back so a reply never has audible
 * gaps between frames. `stop()` drops everything that has not been played yet,
 * which is what makes barge-in feel instant.
 */
export class PcmPlayer {
  private context: AudioContext | null = null;
  private readonly sampleRate: number;
  private nextStartTime = 0;
  private readonly sources = new Set<AudioBufferSourceNode>();
  private readonly idleWaiters = new Set<() => void>();
  private closed = false;

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
  }

  private ensureContext(): AudioContext {
    if (this.closed) {
      throw new Error("Audio player has been closed.");
    }
    if (!this.context) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) {
        throw new Error("Web Audio is not supported in this browser.");
      }
      this.context = new Ctor();
    }
    return this.context;
  }

  /** Resumes playback after an autoplay-policy suspension. */
  async resume(): Promise<void> {
    const context = this.ensureContext();
    if (context.state === "suspended") {
      await context.resume();
    }
  }

  /**
   * Decodes a base64 PCM16 mono payload and queues it for playback.
   * Returns the duration of the queued audio in seconds.
   */
  enqueueBase64(base64: string): number {
    const bytes = base64ToUint8Array(base64);
    if (bytes.byteLength < 2) return 0;

    const samples = new Int16Array(
      bytes.buffer,
      bytes.byteOffset,
      Math.floor(bytes.byteLength / 2),
    );

    const context = this.ensureContext();
    const buffer = context.createBuffer(1, samples.length, this.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) {
      channel[i] = samples[i] / 0x8000;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    const now = context.currentTime;
    // Small lead time avoids scheduling in the past on some browsers.
    const startAt = Math.max(this.nextStartTime, now + 0.02);
    this.nextStartTime = startAt + buffer.duration;

    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      if (this.sources.size === 0) this.flushIdleWaiters();
    };
    source.start(startAt);

    return buffer.duration;
  }

  /** True while audio is still queued or playing. */
  get isPlaying(): boolean {
    return this.sources.size > 0;
  }

  /**
   * Resolves once every queued chunk has finished playing. The server only
   * tells us when the audio bytes were *delivered*, so this is what lets the
   * UI stay in the "speaking" state until the user actually hears the reply.
   */
  whenIdle(): Promise<void> {
    if (this.sources.size === 0) return Promise.resolve();
    return new Promise((resolve) => {
      this.idleWaiters.add(resolve);
    });
  }

  private flushIdleWaiters(): void {
    if (this.idleWaiters.size === 0) return;
    const waiters = [...this.idleWaiters];
    this.idleWaiters.clear();
    for (const resolve of waiters) resolve();
  }

  /** Drops every queued/playing chunk and rewinds the playhead. */
  stop(): void {
    for (const source of this.sources) {
      try {
        source.onended = null;
        source.stop();
      } catch {
        // Already stopped.
      }
    }
    this.sources.clear();
    this.flushIdleWaiters();
    if (this.context) {
      this.nextStartTime = this.context.currentTime;
    }
  }

  /** Releases the underlying AudioContext. */
  async close(): Promise<void> {
    this.stop();
    this.closed = true;
    if (this.context) {
      try {
        await this.context.close();
      } catch {
        // Already closed.
      }
      this.context = null;
    }
  }
}

/** Decodes a standard base64 string into bytes. */
export function base64ToUint8Array(base64: string): Uint8Array {
  const normalized = base64.includes(",") ? base64.split(",").pop() ?? "" : base64;
  const binary = atob(normalized.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
