/**
 * lib/useWsEnrollment.ts
 * ----------------------
 * WS-driven voice enrollment hook.
 *
 * Connect-first ordering:
 *   1. connect() creates the MediatorSocket immediately — the WS starts
 *      dialing in the background.  No mic, no user-gesture required yet.
 *   2. activate() is only called from a user-gesture handler (tap/click).
 *      If the socket is already "connected" it requests the mic and sends
 *      begin_enrollment immediately.  If it's still "connecting" / "reconnecting"
 *      activate() is a no-op — the caller should show a "waiting" UI instead and
 *      call activate() again once status reaches "connected".
 *   3. After both slots are confirmed the caller receives:
 *        - enrolledNames: [string, string]
 *        - sock: the already-open socket (kept alive so start_session can be sent)
 *
 * No getUserMedia call except inside MicCapture.start(), which is called
 * lazily inside activate() — always from a user-gesture context.
 *
 * The hook never calls start_session itself — the caller does so after
 * supplying the collected names.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { MediatorSocket, connect } from './websocket'
import type { WsStatus } from './websocket'
import { MicCapture } from './micCapture'
import type { EnrollmentResultMessage, ServerMessage } from './types'

// ---------------------------------------------------------------------------
// Per-slot state
// ---------------------------------------------------------------------------

export type WsSlotPhase =
  | 'idle'
  | 'waiting'      // begin_enrollment sent, waiting for enrollment_result
  | 'confirmed'    // name received and accepted
  | 'no_name'      // null name, no flags — prompt failed, can retry
  | 'duplicate'    // same voice as a prior slot
  | 'give_up'      // 3× duplicate — caller should show typed fallback

export interface WsSlotState {
  phase: WsSlotPhase
  name: string | null        // set when confirmed
  duplicateOf: string | null // set when phase === 'duplicate'
}

export interface WsEnrollmentState {
  /** 0 = enrolling slot 1, 1 = enrolling slot 2, 2 = done */
  activeSlot: 0 | 1 | 2
  slots: [WsSlotState, WsSlotState]
  /** Set when both slots are confirmed */
  enrolledNames: [string, string] | null
  micError: string | null
  wsError: string | null
  /** Live WebSocket connection status */
  wsStatus: WsStatus
}

export interface UseWsEnrollmentReturn {
  state: WsEnrollmentState
  /**
   * Activate enrollment for the current active slot.
   * MUST be called from a user-gesture handler (tap/click) so the browser
   * allows AudioContext creation.
   * No-op if wsStatus is not "connected" — caller should wait and retry.
   */
  activate: () => Promise<void>
  /**
   * Confirm the current slot with a typed name (fallback path).
   * Advances to the next slot or finishes.
   */
  confirmTyped: (name: string) => void
  /**
   * The open MediatorSocket — valid after connect() creates it on mount.
   * Caller uses it to send start_session after enrollment completes.
   */
  sock: MediatorSocket | null
  /** Release mic + WS. Call on unmount or after navigation. */
  teardown: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWsEnrollment(sessionId: string, userEmail = '', token = ''): UseWsEnrollmentReturn {
  const sockRef = useRef<MediatorSocket | null>(null)
  const micRef  = useRef<MicCapture | null>(null)
  const unsubMsgRef    = useRef<(() => void) | null>(null)
  const unsubStatusRef = useRef<(() => void) | null>(null)
  // Separate state so changes to the socket reference trigger a re-render;
  // callers always receive the current socket, not the stale null from the
  // initial render before the useEffect ran.
  const [sockState, setSockState] = useState<MediatorSocket | null>(null)

  const [state, setState] = useState<WsEnrollmentState>({
    activeSlot: 0,
    slots: [
      { phase: 'idle', name: null, duplicateOf: null },
      { phase: 'idle', name: null, duplicateOf: null },
    ],
    enrolledNames: null,
    micError: null,
    wsError: null,
    wsStatus: 'connecting',
  })

  // Keep a ref of state for use inside callbacks that close over stale values
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  // ---------------------------------------------------------------------------
  // Teardown
  // ---------------------------------------------------------------------------
  const teardown = useCallback(() => {
    unsubMsgRef.current?.()
    unsubMsgRef.current = null
    unsubStatusRef.current?.()
    unsubStatusRef.current = null
    micRef.current?.stop()
    micRef.current = null
    sockRef.current?.disconnect()
    sockRef.current = null
  }, [])

  useEffect(() => () => teardown(), [teardown])

  // ---------------------------------------------------------------------------
  // WS message handler
  // ---------------------------------------------------------------------------
  const handleMessage = useCallback((msg: ServerMessage) => {
    if (msg.type !== 'enrollment_result') return

    const { slot, name, duplicate_of, give_up } = msg as EnrollmentResultMessage

    // slot is 1-based from backend; our state uses 0-based
    const slotIdx = (slot - 1) as 0 | 1

    setState((prev) => {
      const newSlots: [WsSlotState, WsSlotState] = [
        { ...prev.slots[0] },
        { ...prev.slots[1] },
      ]

      if (name) {
        // Success
        newSlots[slotIdx] = { phase: 'confirmed', name, duplicateOf: null }

        if (slotIdx === 0) {
          return { ...prev, slots: newSlots, activeSlot: 1 }
        }
        // Both confirmed
        const name0 = newSlots[0].name!
        return {
          ...prev,
          slots: newSlots,
          activeSlot: 2,
          enrolledNames: [name0, name],
        }
      }

      if (give_up) {
        newSlots[slotIdx] = { phase: 'give_up', name: null, duplicateOf: null }
        return { ...prev, slots: newSlots }
      }

      if (duplicate_of) {
        newSlots[slotIdx] = { phase: 'duplicate', name: null, duplicateOf: duplicate_of }
        return { ...prev, slots: newSlots }
      }

      // name null, no flags → no_name (ASR/LLM got nothing)
      newSlots[slotIdx] = { phase: 'no_name', name: null, duplicateOf: null }
      return { ...prev, slots: newSlots }
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Connect the socket on mount — before any user gesture.
  // This gives the WS time to dial while the user is reading the splash screen.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (sockRef.current) return   // already created (StrictMode double-invoke)

    const sock = connect(sessionId, userEmail, token)
    sockRef.current = sock
    setSockState(sock)   // trigger re-render so callers get the real socket

    unsubMsgRef.current = sock.on(handleMessage)

    unsubStatusRef.current = sock.onStatus((status) => {
      setState((prev) => {
        // If we transition from failed→connected (user restarted backend),
        // clear any prior wsError message.
        const wsError =
          status === 'connected' ? null
          : status === 'failed'  ? 'Backend unreachable — start uvicorn and retry'
          : prev.wsError
        return { ...prev, wsStatus: status, wsError }
      })
    })

    // Cleanup on unmount handled by teardown()
  }, [sessionId, handleMessage])

  // ---------------------------------------------------------------------------
  // Public: activate — send begin_enrollment for the current slot.
  // Only proceeds when the socket is already "connected".
  // ---------------------------------------------------------------------------
  const activate = useCallback(async () => {
    const slot = stateRef.current.activeSlot as 0 | 1
    if (slot >= 2) return

    const sock = sockRef.current
    if (!sock || sock.status !== 'connected') {
      // Still dialing — caller should show "waiting" UI and not call again yet
      return
    }

    // Request mic — must be inside a user-gesture call stack
    if (!micRef.current) {
      const mic = new MicCapture({
        socket: sock,
        onError: (err) => {
          setState((prev) => ({ ...prev, micError: err }))
        },
      })
      const ok = await mic.start()
      if (!ok) return
      micRef.current = mic
    }

    setState((prev) => {
      const newSlots: [WsSlotState, WsSlotState] = [
        { ...prev.slots[0] },
        { ...prev.slots[1] },
      ]
      newSlots[slot] = { phase: 'waiting', name: null, duplicateOf: null }
      return { ...prev, slots: newSlots }
    })

    sock.send({ type: 'begin_enrollment', slot: slot + 1 })
  }, [])

  // ---------------------------------------------------------------------------
  // Public: confirmTyped — typed-name fallback for a slot
  // ---------------------------------------------------------------------------
  const confirmTyped = useCallback((name: string) => {
    const trimmed = name.trim() || `Speaker ${stateRef.current.activeSlot + 1}`
    setState((prev) => {
      const slot = prev.activeSlot as 0 | 1
      if (slot >= 2) return prev

      const newSlots: [WsSlotState, WsSlotState] = [
        { ...prev.slots[0] },
        { ...prev.slots[1] },
      ]
      newSlots[slot] = { phase: 'confirmed', name: trimmed, duplicateOf: null }

      if (slot === 0) {
        return { ...prev, slots: newSlots, activeSlot: 1 }
      }
      const name0 = newSlots[0].name!
      return {
        ...prev,
        slots: newSlots,
        activeSlot: 2,
        enrolledNames: [name0, trimmed],
      }
    })
  }, [])

  return {
    state,
    activate,
    confirmTyped,
    sock: sockState,
    teardown,
  }
}
