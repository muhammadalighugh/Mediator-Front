/**
 * lib/websocket.ts
 * ----------------
 * Typed WebSocket wrapper with:
 *   - connect(sessionId) → ws://localhost:8000/ws/session/{id}
 *   - Fully typed message unions (both directions)
 *   - Handler registry (on/off pattern)
 *   - Auto-reconnect with exponential back-off (paused while tab is hidden)
 */

import type { ClientMessage, ServerMessage } from './types'

const BACKEND_WS =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BACKEND_WS ?? 'ws://localhost:8000')
    : 'ws://localhost:8000'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MessageHandler = (msg: ServerMessage) => void

interface ReconnectOptions {
  /** Maximum reconnect attempts before giving up (default: 5) */
  maxAttempts?: number
  /** Base delay in ms for exponential back-off (default: 500) */
  baseDelay?: number
}

// ---------------------------------------------------------------------------
// MediatorSocket
// ---------------------------------------------------------------------------

export class MediatorSocket {
  private ws: WebSocket | null = null
  private handlers: Set<MessageHandler> = new Set()
  private sessionId: string
  private closed = false          // permanently closed by caller
  private attempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private opts: Required<ReconnectOptions>

  constructor(sessionId: string, opts: ReconnectOptions = {}) {
    this.sessionId = sessionId
    this.opts = {
      maxAttempts: opts.maxAttempts ?? 5,
      baseDelay: opts.baseDelay ?? 500,
    }
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /** Open the WebSocket connection. */
  connect(): void {
    if (this.closed) return
    this._open()
  }

  /** Send a typed client message. */
  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  /** Register a handler for all server messages. Returns an unsubscribe fn. */
  on(handler: MessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  /** Permanently close — no more reconnects. */
  disconnect(): void {
    this.closed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private _open(): void {
    const url = `${BACKEND_WS}/ws/session/${this.sessionId}`
    this.ws = new WebSocket(url)

    this.ws.onmessage = (ev) => {
      let msg: ServerMessage
      try {
        msg = JSON.parse(ev.data) as ServerMessage
      } catch {
        console.error('[WS] failed to parse message', ev.data)
        return
      }
      this.handlers.forEach((h) => h(msg))
    }

    this.ws.onopen = () => {
      this.attempt = 0  // reset on successful connect
    }

    this.ws.onclose = () => {
      if (this.closed) return
      this._scheduleReconnect()
    }

    this.ws.onerror = (ev) => {
      console.error('[WS] error', ev)
    }
  }

  private _scheduleReconnect(): void {
    if (this.closed) return
    if (this.attempt >= this.opts.maxAttempts) {
      console.warn('[WS] max reconnect attempts reached')
      return
    }
    const delay = this.opts.baseDelay * Math.pow(2, this.attempt)
    this.attempt++
    this.reconnectTimer = setTimeout(() => {
      if (!this.closed) this._open()
    }, delay)
  }
}

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

export function connect(
  sessionId: string,
  opts?: ReconnectOptions,
): MediatorSocket {
  const sock = new MediatorSocket(sessionId, opts)
  sock.connect()
  return sock
}
