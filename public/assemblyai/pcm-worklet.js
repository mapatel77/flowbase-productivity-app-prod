/**
 * Buffers mono microphone samples and posts 16-bit little-endian PCM chunks.
 * AssemblyAI streaming expects raw PCM (pcm_s16le) at the context sample rate.
 */
class PCM16Streamer extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const chunkDurationMs = options?.processorOptions?.chunkDurationMs ?? 100;
    this.chunkFrames = Math.max(
      128,
      Math.round((sampleRate * chunkDurationMs) / 1000),
    );
    this.buffer = new Float32Array(this.chunkFrames);
    this.offset = 0;

    this.port.onmessage = (event) => {
      if (event.data?.type === "flush") this.flush();
    };
  }

  flush() {
    if (this.offset === 0) return;

    const frames = this.offset;
    const pcm = new Int16Array(frames);

    for (let index = 0; index < frames; index += 1) {
      const sample = Math.max(-1, Math.min(1, this.buffer[index]));
      pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    this.offset = 0;
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channels = input.length;
    const frames = input[0]?.length ?? 0;

    for (let frame = 0; frame < frames; frame += 1) {
      let sample = 0;
      for (let channel = 0; channel < channels; channel += 1) {
        sample += input[channel][frame] ?? 0;
      }
      this.buffer[this.offset] = sample / channels;
      this.offset += 1;

      if (this.offset >= this.chunkFrames) this.flush();
    }

    return true;
  }
}

registerProcessor("pcm16-streamer", PCM16Streamer);
