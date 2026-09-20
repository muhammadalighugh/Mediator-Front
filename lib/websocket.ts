/**
 * lib/websocket.ts
 * ----------------
 * Typed WebSocket wrapper with:
 *   - connect(sessionId) → ws://127.0.0.1:8000/ws/session/{id}
 *   - Fully typed message unions (both directions)
 *   - Handler registry (on/off pattern)
 *   - Persistent retry: fixed 2 s interval, max 15 attempts before "failed"
 *   - Status events: "connecting" | "connected" | "reconnecting" | "failed"
 *   - Audio chunks sent while disconnected are dropped silently
 */

import type { ClientMessage, ServerMessage } from './types'

// Overridable via NEXT_PUBLIC_WS_URL env var; IPv4 explicit to avoid Chrome
// resolving "localhost" → ::1 (IPv6) while uvicorn only binds 127.0.0.1.
const WS_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL) ||
  'ws://127.0.0.1:8000'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WsStatus = 'connecting' | 'connected' | 'reconnecting' | 'failed'

type MessageHandler = (msg: ServerMessage) => void
type StatusHandler  = (status: WsStatus) => void

// ---------------------------------------------------------------------------
// MediatorSocket
// ---------------------------------------------------------------------------

const RETRY_INTERVAL_MS = 2000
const MAX_ATTEMPTS      = 15

export class MediatorSocket {
  private ws: WebSocket | null = null
  private msgHandlers: Set<MessageHandler> = new Set()
  private statusHandlers: Set<StatusHandler> = new Set()
  private sessionId: string
  /** Permanently closed by caller — no more reconnects. */
  private closed = false
  /** Whether the session ended gracefully (no reconnect desired). */
  private sessionEnded = false
  private attempt = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private _status: WsStatus = 'connecting'

  constructor(sessionId: string) {
    this.sessionId = sessionId
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /** Open the WebSocket connection. */
  connect(): void {
    if (this.closed) return
    this._setStatus('connecting')
    this._open()
  }

  /** Send a typed client message. Drops silently if not connected. */
  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
    // Audio chunks and other messages dropped while disconnected — intentional.
  }

  /** Register a handler for all server messages. Returns an unsubscribe fn. */
  on(handler: MessageHandler): () => void {
    this.msgHandlers.add(handler)
    return () => this.msgHandlers.delete(handler)
  }

  /** Register a handler for connection-status changes. Returns an unsubscribe fn. */
  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    // Immediately deliver the current status so the caller doesn't miss it.
    handler(this._status)
    return () => this.statusHandlers.delete(handler)
  }

  get status(): WsStatus {
    return this._status
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }

  /** Permanently close — no more reconnects. */
  disconnect(): void {
    this.closed = true
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.ws?.close()
    this.ws = null
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private _setStatus(s: WsStatus): void {
    if (this._status === s) return
    this._status = s
    this.statusHandlers.forEach((h) => h(s))
  }

  private _open(): void {
    const url = `${WS_BASE}/ws/session/${this.sessionId}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.attempt = 0
      this._setStatus('connected')
    }

    this.ws.onmessage = (ev) => {
      let msg: ServerMessage
      try {
        msg = JSON.parse(ev.data) as ServerMessage
      } catch {
        console.error('[WS] failed to parse message', ev.data)
        return
      }
      // Track graceful session end so we don't retry after it
      if (msg.type === 'session_ended') this.sessionEnded = true
      this.msgHandlers.forEach((h) => h(msg))
    }

    this.ws.onclose = () => {
      if (this.closed || this.sessionEnded) return
      this._scheduleRetry()
    }

    this.ws.onerror = () => {
      // onerror always fires before onclose; let onclose drive retry logic.
      // Nothing to do here except avoid an unhandled event log.
    }
  }

  private _scheduleRetry(): void {
    if (this.closed) return
    if (this.attempt >= MAX_ATTEMPTS) {
      console.warn('[WS] max reconnect attempts reached — giving up')
      this._setStatus('failed')
      return
    }
    this.attempt++
    this._setStatus('reconnecting')
    this.retryTimer = setTimeout(() => {
      if (!this.closed) this._open()
    }, RETRY_INTERVAL_MS)
  }
}

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

export function connect(sessionId: string): MediatorSocket {
  const sock = new MediatorSocket(sessionId)
  sock.connect()
  return sock
}
