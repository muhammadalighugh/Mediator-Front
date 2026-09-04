/**
 * pcm-worklet.js
 * --------------
 * AudioWorkletProcessor: Float32 → Int16 PCM conversion + chunk buffering.
 *
 * IMPORTANT: The AudioContext is created with { sampleRate: 16000 } in the
 * main thread. The browser's native audio graph resampler converts the mic
 * stream (typically 48kHz) to 16kHz before this worklet ever sees any data.
 * Therefore this worklet does NO downsampling, NO decimation, NO interpolation.
 *
 * WHY BUFFERING: The browser's audio render quantum is 128 samples regardless
 * of sample rate, giving 128/16000 = 8ms per process() call. AssemblyAI
 * requires chunks of 50–1000ms. We accumulate samples until we have at least
 * FLUSH_SAMPLES (1600 = 100ms at 16kHz) before posting to the main thread.
 *
 * Do NOT connect the worklet node to ctx.destination — feedback loop.
 */

const FLUSH_SAMPLES = 1600  // 100ms at 16kHz — well within 50-1000ms window

class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buf = new Int16Array(FLUSH_SAMPLES * 4)  // pre-allocate 4× flush size
    this._len = 0
  }

  process(inputs) {
    const ch = inputs[0]?.[0]
    if (!ch) return true

    // Convert incoming Float32 frame → Int16 and append to buffer
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]))
      // Grow buffer if needed (shouldn't happen with 4× pre-alloc, but safe)
      if (this._len >= this._buf.length) {
        const bigger = new Int16Array(this._buf.length * 2)
        bigger.set(this._buf)
        this._buf = bigger
      }
      this._buf[this._len++] = s < 0 ? s * 0x8000 : s * 0x7fff
    }

    // Flush when we have enough samples for a valid AssemblyAI chunk
    if (this._len >= FLUSH_SAMPLES) {
      const out = this._buf.slice(0, this._len)
      this.port.postMessage(out.buffer, [out.buffer])
      this._len = 0
    }

    return true
  }
}

registerProcessor('pcm-capture', PcmCapture)
