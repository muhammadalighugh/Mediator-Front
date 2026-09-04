/**
 * lib/micCapture.ts
 * -----------------
 * Microphone capture pipeline:
 *   getUserMedia → AudioContext({ sampleRate: 16000 }) → MediaStreamSource
 *   → AudioWorkletNode('pcm-capture') [pcm-worklet.js]
 *   → main thread: base64-encode → WS audio_chunk frames
 *
 * The AudioContext is created at 16kHz. The browser's native resampler converts
 * the 48kHz mic stream to 16kHz automatically inside the audio graph.
 * There is NO manual downsampling or interpolation anywhere in this file.
 *
 * If ctx.sampleRate !== 16000 after construction (Safari quirk), the caller
 * receives an error and must surface a "Use Chrome" banner.
 */

import type { MediatorSocket } from './websocket'

const SAMPLE_RATE = 16000

export interface MicCaptureOptions {
  socket: MediatorSocket
  onError?: (err: string) => void
}

export class MicCapture {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private worklet: AudioWorkletNode | null = null
  private muted = false
  private socket: MediatorSocket
  private onError: (err: string) => void

  constructor(opts: MicCaptureOptions) {
    this.socket = opts.socket
    this.onError = opts.onError ?? console.error
  }

  /**
   * Start microphone capture. Returns true on success.
   * On Safari (sampleRate mismatch), returns false and calls onError.
   */
  async start(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      this.onError(`Microphone access denied: ${err}`)
      return false
    }

    // Create AudioContext at target sample rate.
    // The browser resamples the mic stream to match — no code needed.
    this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE })

    // Safari and some mobile browsers may ignore the requested sampleRate
    if (this.ctx.sampleRate !== SAMPLE_RATE) {
      this.onError(
        `Your browser created an AudioContext at ${this.ctx.sampleRate} Hz instead of ` +
        `${SAMPLE_RATE} Hz. Live sessions require Chrome or Edge. ` +
        `(Use the scripted demo as a fallback.)`
      )
      await this.ctx.close()
      this.stream.getTracks().forEach((t) => t.stop())
      return false
    }

    // Load the worklet processor from /public
    await this.ctx.audioWorklet.addModule('/pcm-worklet.js')

    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.worklet = new AudioWorkletNode(this.ctx, 'pcm-capture')

    // Receive PCM Int16 buffers from the worklet, base64-encode, send
    this.worklet.port.onmessage = (ev: MessageEvent<ArrayBuffer>) => {
      if (this.muted) return
      const b64 = btoa(
        String.fromCharCode(...new Uint8Array(ev.data))
      )
      this.socket.send({ type: 'audio_chunk', data: b64 })
    }

    // Connect source → worklet. Do NOT connect worklet to destination.
    this.source.connect(this.worklet)

    return true
  }

  /** Toggle mute. When muted, PCM frames are silently dropped. */
  setMuted(muted: boolean): void {
    this.muted = muted
  }

  isMuted(): boolean {
    return this.muted
  }

  /** Stop capture and release all resources. */
  async stop(): Promise<void> {
    this.worklet?.disconnect()
    this.source?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    await this.ctx?.close()
    this.worklet = null
    this.source = null
    this.stream = null
    this.ctx = null
  }
}
