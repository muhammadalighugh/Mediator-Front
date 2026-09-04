/**
 * lib/demoPlayer.ts
 * -----------------
 * Scripted demo audio player.
 *
 * Flow:
 *   1. fetch /demo/sample_conversation.mp3 → arrayBuffer
 *   2. decodeAudioData on an AudioContext({ sampleRate: 16000 })
 *      → Chrome resamples during decode to 16kHz automatically
 *   3. Assert buffer.sampleRate === 16000; if not, do a one-time linear
 *      interpolation resample (offline, not realtime — acceptable)
 *   4. Float32 → Int16 conversion (same logic as pcm-worklet.js)
 *   5. Split into 1600-sample (100ms @ 16kHz) frames
 *   6. Send one audio_chunk per ~100ms with real-time pacing
 *      (setTimeout-based; AssemblyAI streaming expects real-time input)
 *
 * NOTE: Step 2 handles resampling via the browser decode pipeline.
 * The linear-interpolation fallback in step 3 is a one-time offline
 * computation that only fires if the browser decode fails to honour
 * the requested sampleRate — it is NOT used for live mic capture.
 */

import type { MediatorSocket } from './websocket'

const TARGET_RATE = 16000
const FRAME_SAMPLES = 1600        // 100ms at 16kHz
const FRAME_INTERVAL_MS = 100

function float32ToInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

/** One-time linear interpolation resample (offline fallback only). */
function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  const ratio = fromRate / toRate
  const outLen = Math.round(input.length / ratio)
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio
    const idx = Math.floor(pos)
    const frac = pos - idx
    const a = input[idx] ?? 0
    const b = input[idx + 1] ?? a
    out[i] = a + frac * (b - a)
  }
  return out
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

export interface DemoPlayerOptions {
  socket: MediatorSocket
  onProgress?: (framesPlayed: number, totalFrames: number) => void
  onDone?: () => void
}

export async function playDemo(opts: DemoPlayerOptions): Promise<void> {
  const { socket, onProgress, onDone } = opts

  // 1. Fetch the demo MP3
  const res = await fetch('/demo/sample_conversation.mp3')
  if (!res.ok) throw new Error(`Failed to fetch demo audio: ${res.statusText}`)
  const arrayBuf = await res.arrayBuffer()

  // 2. Decode at 16kHz — the browser resamples during decode
  const ctx = new AudioContext({ sampleRate: TARGET_RATE })
  let audioBuffer: AudioBuffer
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuf)
  } finally {
    await ctx.close()
  }

  // 3. Assert sample rate; offline linear-interpolation fallback if needed
  let samples = audioBuffer.getChannelData(0)   // mono
  if (audioBuffer.sampleRate !== TARGET_RATE) {
    console.warn(
      `[DemoPlayer] decodeAudioData returned ${audioBuffer.sampleRate} Hz — ` +
      `applying offline linear-interpolation resample to ${TARGET_RATE} Hz.`
    )
    samples = resampleLinear(samples, audioBuffer.sampleRate, TARGET_RATE)
  }

  // 4-5. Build Int16 frame array
  const int16 = float32ToInt16(samples)
  const totalFrames = Math.ceil(int16.length / FRAME_SAMPLES)

  // 6. Stream frames with real-time pacing
  let frame = 0
  await new Promise<void>((resolve) => {
    function sendNextFrame() {
      if (frame >= totalFrames) {
        onDone?.()
        resolve()
        return
      }
      const start = frame * FRAME_SAMPLES
      const chunk = int16.slice(start, start + FRAME_SAMPLES)
      const b64 = arrayBufferToBase64(chunk.buffer)
      socket.send({ type: 'audio_chunk', data: b64 })
      onProgress?.(frame + 1, totalFrames)
      frame++
      setTimeout(sendNextFrame, FRAME_INTERVAL_MS)
    }
    sendNextFrame()
  })
}
