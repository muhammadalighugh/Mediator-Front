/**
 * lib/useVoiceEnrollment.ts
 * -------------------------
 * React hook for the voice enrollment flow.
 *
 * Uses the browser's SpeechRecognition API (Chrome / Edge).
 * No backend connection, no AudioWorklet — enrollment is entirely local.
 *
 * State machine per slot:
 *   idle → listening → heard (name extracted) → confirmed
 *                    → retrying (attempt 2 or 3, bad result)
 *                    → fallback (3 failures → show typed input)
 *
 * Name extraction: strips preambles like "I'm", "my name is", "call me",
 * "I am", then title-cases the first remaining word. Works for single and
 * multi-word names in any language (does not assume English word boundaries —
 * preamble stripping is English-only but bare names pass through unchanged).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Browser SpeechRecognition shim
// Declare minimal interfaces locally so this file compiles without
// @types/web or a specific lib target that exposes these globals.
// ---------------------------------------------------------------------------

interface SpeechRecognitionResult {
  readonly length: number
  item(index: number): { transcript: string; confidence: number }
  [index: number]: { transcript: string; confidence: number }
}
interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  lang: string
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition ??
    null
  )
}

export const isSpeechRecognitionSupported = (): boolean =>
  getSpeechRecognition() !== null

// ---------------------------------------------------------------------------
// Name extraction
// ---------------------------------------------------------------------------

// English preambles to strip before the actual name.
// Non-English names (Urdu, Hindi, etc.) pass through unchanged because bare
// names contain no matching preamble — the regex won't fire.
const PREAMBLE_RE =
  /^(?:i(?:'m| am)|my name is|call me|they call me|it's|its)\s+/i

export function extractName(transcript: string): string | null {
  const t = transcript.trim()
  if (!t) return null
  const stripped = t.replace(PREAMBLE_RE, '').trim()
  if (!stripped) return null
  // Title-case the first word; keep the rest as-is (preserves multi-word names)
  const [first, ...rest] = stripped.split(/\s+/)
  const named =
    first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() +
    (rest.length ? ' ' + rest.join(' ') : '')
  return named || null
}

// ---------------------------------------------------------------------------
// speechSynthesis helper
// ---------------------------------------------------------------------------

export function speak(text: string, muted: boolean): void {
  if (muted || typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.95
  window.speechSynthesis.speak(utt)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SlotState =
  | { phase: 'idle' }
  | { phase: 'listening'; attempt: number }
  | { phase: 'retry'; attempt: number; lastTranscript: string }
  | { phase: 'confirmed'; name: string }
  | { phase: 'fallback' }

export interface EnrollmentState {
  /** 0 = enrolling speaker 1, 1 = enrolling speaker 2, 2 = done */
  slot: 0 | 1 | 2
  slots: [SlotState, SlotState]
  /** Both names available when slot === 2 */
  names: [string, string] | null
}

export interface UseVoiceEnrollmentReturn {
  state: EnrollmentState
  /** Kick off listening for the current slot. No-op if already listening. */
  startListening: () => void
  /** Override the current slot with a typed name and advance. */
  confirmTyped: (name: string) => void
  /** Set typed fallback for slot 0 only (for skip-to-fallback path). */
  setFallback: (slot: 0 | 1) => void
  /** True when SpeechRecognition is available in this browser. */
  supported: boolean
  /** Whether voice prompts are muted. Toggle with toggleMute(). */
  voiceMuted: boolean
  toggleMute: () => void
}

const MAX_ATTEMPTS = 3

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVoiceEnrollment(): UseVoiceEnrollmentReturn {
  const supported = isSpeechRecognitionSupported()

  const [voiceMuted, setVoiceMuted] = useState(false)
  const voiceMutedRef = useRef(voiceMuted)
  useEffect(() => { voiceMutedRef.current = voiceMuted }, [voiceMuted])

  const [state, setState] = useState<EnrollmentState>({
    slot: 0,
    slots: [{ phase: 'idle' }, { phase: 'idle' }],
    names: null,
  })

  const recRef = useRef<SpeechRecognitionInstance | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recRef.current?.abort()
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Internal: advance to the next slot or finish
  // ---------------------------------------------------------------------------
  const confirmName = useCallback((slot: 0 | 1, name: string) => {
    setState((prev) => {
      const newSlots: [SlotState, SlotState] = [
        ...prev.slots,
      ] as [SlotState, SlotState]
      newSlots[slot] = { phase: 'confirmed', name }

      if (slot === 0) {
        return { ...prev, slots: newSlots, slot: 1 }
      }
      // Both confirmed
      const name0 =
        (newSlots[0] as Extract<SlotState, { phase: 'confirmed' }>).name
      return {
        slot: 2,
        slots: newSlots,
        names: [name0, name],
      }
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Internal: run one SpeechRecognition attempt
  // ---------------------------------------------------------------------------
  const runRecognition = useCallback(
    (slot: 0 | 1, attempt: number) => {
      const Ctor = getSpeechRecognition()
      if (!Ctor) return

      setState((prev) => {
        const newSlots: [SlotState, SlotState] = [...prev.slots] as [SlotState, SlotState]
        newSlots[slot] = { phase: 'listening', attempt }
        return { ...prev, slots: newSlots }
      })

      recRef.current?.abort()
      const rec = new Ctor()
      recRef.current = rec
      rec.continuous = false
      rec.interimResults = false
      rec.maxAlternatives = 3
      // Don't set rec.lang — let the browser use OS locale so non-English
      // names (Urdu, Hindi) are recognized as-is.

      rec.onresult = (ev: SpeechRecognitionEvent) => {
        // Try all alternatives until one yields a non-null name
        let extracted: string | null = null
        for (let i = 0; i < ev.results[0].length; i++) {
          extracted = extractName(ev.results[0][i].transcript)
          if (extracted) break
        }

        if (extracted) {
          recRef.current = null
          speak(`Welcome, ${extracted}`, voiceMutedRef.current)
          confirmName(slot, extracted)
        } else {
          // No usable name found
          handleNoName(slot, attempt, ev.results[0][0]?.transcript ?? '')
        }
      }

      rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
        if (ev.error === 'aborted') return // intentional abort — ignore
        handleNoName(slot, attempt, '')
      }

      rec.onend = () => {
        // onend fires after onresult too — only act if we're still in
        // 'listening' phase (i.e. onresult didn't handle it)
        setState((prev) => {
          const s = prev.slots[slot]
          if (s.phase === 'listening') {
            // Fired without a result (silence timeout)
            handleNoName(slot, attempt, '')
          }
          return prev
        })
      }

      rec.start()
    },
    [confirmName], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ---------------------------------------------------------------------------
  // Internal: handle a failed attempt
  // ---------------------------------------------------------------------------
  function handleNoName(slot: 0 | 1, attempt: number, lastTranscript: string) {
    recRef.current = null
    if (attempt >= MAX_ATTEMPTS) {
      setState((prev) => {
        const newSlots: [SlotState, SlotState] = [...prev.slots] as [SlotState, SlotState]
        newSlots[slot] = { phase: 'fallback' }
        return { ...prev, slots: newSlots }
      })
      return
    }
    setState((prev) => {
      const newSlots: [SlotState, SlotState] = [...prev.slots] as [SlotState, SlotState]
      newSlots[slot] = { phase: 'retry', attempt, lastTranscript }
      return { ...prev, slots: newSlots }
    })
  }

  // ---------------------------------------------------------------------------
  // Public: startListening
  // ---------------------------------------------------------------------------
  const startListening = useCallback(() => {
    setState((prev) => {
      const slot = prev.slot as 0 | 1
      if (slot >= 2) return prev
      const s = prev.slots[slot]
      // Don't restart if already listening
      if (s.phase === 'listening') return prev

      const attempt =
        s.phase === 'retry' ? s.attempt + 1 : 1

      const label = slot === 0 ? 'one' : 'two'
      speak(`Speaker ${label}, what's your name?`, voiceMutedRef.current)

      // Slight delay so speechSynthesis has time to start before mic opens
      setTimeout(() => runRecognition(slot, attempt), voiceMutedRef.current ? 0 : 1800)

      const newSlots: [SlotState, SlotState] = [...prev.slots] as [SlotState, SlotState]
      newSlots[slot] = { phase: 'listening', attempt }
      return { ...prev, slots: newSlots }
    })
  }, [runRecognition])

  // ---------------------------------------------------------------------------
  // Public: confirmTyped
  // ---------------------------------------------------------------------------
  const confirmTyped = useCallback(
    (name: string) => {
      setState((prev) => {
        const slot = prev.slot as 0 | 1
        if (slot >= 2) return prev
        recRef.current?.abort()
        const trimmed = name.trim() || `Speaker ${slot + 1}`
        // Directly call confirmName logic inline (can't call hook fn from setState)
        const newSlots: [SlotState, SlotState] = [...prev.slots] as [SlotState, SlotState]
        newSlots[slot] = { phase: 'confirmed', name: trimmed }
        if (slot === 0) {
          return { ...prev, slots: newSlots, slot: 1 }
        }
        const name0 = (newSlots[0] as Extract<SlotState, { phase: 'confirmed' }>).name
        return { slot: 2, slots: newSlots, names: [name0, trimmed] }
      })
    },
    [],
  )

  // ---------------------------------------------------------------------------
  // Public: setFallback — force a slot into fallback (typed) mode
  // ---------------------------------------------------------------------------
  const setFallback = useCallback((slot: 0 | 1) => {
    recRef.current?.abort()
    recRef.current = null
    setState((prev) => {
      const newSlots: [SlotState, SlotState] = [...prev.slots] as [SlotState, SlotState]
      newSlots[slot] = { phase: 'fallback' }
      return { ...prev, slots: newSlots }
    })
  }, [])

  const toggleMute = useCallback(() => setVoiceMuted((v) => !v), [])

  return {
    state,
    startListening,
    confirmTyped,
    setFallback,
    supported,
    voiceMuted,
    toggleMute,
  }
}
