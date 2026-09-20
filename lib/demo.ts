/**
 * lib/demo.ts
 * -----------
 * Scripted demo runner — streams a pre-recorded MP3 through the full
 * pipeline with zero microphone interaction.
 *
 * Flow:
 *   fetch /demo/sample_conversation.mp3
 *   → decodeAudioData on AudioContext({ sampleRate: 16000 })
 *     (Chrome resamples during decode; throws if buf.sampleRate !== 16000)
 *   → Float32 → Int16 with clamping
 *   → split into 1600-sample (100 ms @ 16 kHz) frames
 *   → send each frame as an audio_chunk, pacing ~100 ms per frame
 *     (AssemblyAI streaming requires real-time input)
 *   → send end_session
 *
 * No getUserMedia is called anywhere in this path.
 */

import type { MediatorSocket } from './websocket'

const TARGET_RATE   = 16000
const FRAME_SAMPLES = 1600        // 100 ms at 16 kHz
const FRAME_MS      = 100

// ---------------------------------------------------------------------------
// Helpers (duplicated here so demo.ts has zero runtime dependencies on
// demoPlayer.ts — the two files may diverge independently)
// ---------------------------------------------------------------------------

function float32ToInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  // Use chunked String.fromCharCode to avoid call-stack overflow on large buffers
  const bytes = new Uint8Array(buf)
  let binary = ''
  const CHUNK = 8192
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + CHUNK)))
  }
  return btoa(binary)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Stream /demo/sample_conversation.mp3 through `ws` as real-time audio_chunk
 * messages, then send end_session.
 *
 * Throws if:
 *   - The fetch fails (file not found / server unreachable)
 *   - decodeAudioData returns a buffer at the wrong sample rate
 *
 * @param ws  An already-open MediatorSocket. Caller must have sent start_session.
 */
export async function runScriptedDemo(ws: MediatorSocket): Promise<void> {
  // 1. Fetch the demo MP3
  const res = await fetch('/demo/sample_conversation.mp3')
  if (!res.ok) {
    throw new Error(
      `Demo audio not found (${res.status}). ` +
      'Place a recording at frontend/public/demo/sample_conversation.mp3.'
    )
  }
  const arrayBuf = await res.arrayBuffer()

  // 2. Decode at 16 kHz — the browser resamples during decode
  const ctx = new AudioContext({ sampleRate: TARGET_RATE })
  let audioBuffer: AudioBuffer
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuf)
  } finally {
    await ctx.close()
  }

  // 3. Validate sample rate — throw so the caller can surface the error
  if (audioBuffer.sampleRate !== TARGET_RATE) {
    throw new Error(
      `decodeAudioData returned ${audioBuffer.sampleRate} Hz instead of ` +
      `${TARGET_RATE} Hz. Use Chrome or Edge for the demo.`
    )
  }

  // 4. Float32 → Int16
  const int16 = float32ToInt16(audioBuffer.getChannelData(0))
  const totalFrames = Math.ceil(int16.length / FRAME_SAMPLES)

  // 5. Stream frames with real-time pacing
  await new Promise<void>((resolve) => {
    let frame = 0
    function sendNext() {
      if (frame >= totalFrames) {
        ws.send({ type: 'end_session' })
        resolve()
        return
      }
      const start = frame * FRAME_SAMPLES
      ws.send({
        type: 'audio_chunk',
        data: arrayBufferToBase64(int16.slice(start, start + FRAME_SAMPLES).buffer),
      })
      frame++
      setTimeout(sendNext, FRAME_MS)
    }
    sendNext()
  })
}
