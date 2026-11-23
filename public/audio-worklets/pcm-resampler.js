/**
 * Microphone capture worklet that converts the browser's float32 audio into
 * base64-ready PCM16 mono at a requested sample rate.
 *
 * Browsers usually run an `AudioContext` at 44.1 or 48 kHz, while both
 * AssemblyAI products expect a fixed rate (24 kHz for the Voice Agent API,
 * 16 kHz for Real-time STT). This processor resamples with linear
 * interpolation and emits fixed-size chunks.
 *
 * `processorOptions`:
 * - `targetSampleRate` — output sample rate (default 24000).
 * - `chunkMs` — chunk length in milliseconds (default 50).
 *
 * Chunks are kept at 50 ms because AssemblyAI rejects audio frames shorter
 * than 20 ms ("Input Duration Error") and recommends 50–100 ms frames.
 */
class PcmResamplerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const processorOptions = (options && options.processorOptions) || {};
    this.targetRate = processorOptions.targetSampleRate || 24000;
    this.chunkMs = processorOptions.chunkMs || 50;
    this.sourceRate = sampleRate;
    this.ratio = this.sourceRate / this.targetRate;

    // Pending source samples that have not been resampled yet.
    this.source = new Float32Array(0);
    this.sourceLength = 0;
    this.readPosition = 0;

    this.chunkSize = Math.max(
      1,
      Math.round((this.targetRate * this.chunkMs) / 1000),
    );
    this.chunk = new Int16Array(this.chunkSize);
    this.chunkIndex = 0;

    this.closed = false;
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === "close") {
        this.closed = true;
      }
    };
  }

  process(inputs, outputs) {
    // Never echo the microphone back to the speakers.
    const output = outputs && outputs[0];
    if (output && output[0]) {
      output[0].fill(0);
    }

    const input = inputs && inputs[0];
    if (!input || input.length === 0 || !input[0]) {
      return !this.closed;
    }

    const channel = input[0];
    const length = channel.length;

    const merged = new Float32Array(this.sourceLength + length);
    merged.set(this.source, 0);
    merged.set(channel, this.sourceLength);
    this.source = merged;
    this.sourceLength += length;

    while (this.readPosition < this.sourceLength - 1) {
      const index = Math.floor(this.readPosition);
      const fraction = this.readPosition - index;
      const s0 = this.source[index];
      const s1 = this.source[index + 1];

      let value = s0 + (s1 - s0) * fraction;
      if (value > 1) value = 1;
      else if (value < -1) value = -1;

      this.chunk[this.chunkIndex] = value < 0 ? value * 0x8000 : value * 0x7fff;
      this.chunkIndex += 1;

      if (this.chunkIndex >= this.chunkSize) {
        const payload = this.chunk.slice(0);
        this.port.postMessage(payload, [payload.buffer]);
        this.chunkIndex = 0;
      }

      this.readPosition += this.ratio;
    }

    // Drop the samples that have already been resampled. When decimating
    // (ratio > 2) the read position can run past the end of the buffer, so the
    // number of dropped samples is clamped and the remaining fraction of the
    // position is carried over to the next block.
    const drop = Math.min(Math.floor(this.readPosition), this.sourceLength);
    if (drop > 0) {
      this.source = this.source.slice(drop);
      this.sourceLength = this.source.length;
      this.readPosition -= drop;
    }

    return !this.closed;
  }
}

registerProcessor("pcm-resampler", PcmResamplerProcessor);
