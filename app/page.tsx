'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWsEnrollment, type WsSlotState } from '@/lib/useWsEnrollment'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * TEST_MODE — bypass enrollment entirely.
 *
 * When true (default):
 *   Tap → connect WS → send start_session with generic labels →
 *   start mic+worklet → navigate to session view immediately.
 *   No enrollment prompts, no name screens, no waiting for enrollment_result.
 *
 * Set to false (or NEXT_PUBLIC_TEST_MODE=false) to re-enable voice enrollment.
 */
const TEST_MODE: boolean =
  process.env.NEXT_PUBLIC_TEST_MODE !== 'false'

const TEST_SPEAKERS: [string, string] = ['Speaker 1', 'Speaker 2']

const DEMO_SPEAKERS = ['Alex', 'Sam']
const DEMO_EVIDENCE_FILES = [
  '/demo/sample_evidence/expense_log.csv',
  '/demo/sample_evidence/messages.txt',
]

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Stable session ID generated once per page load, before the tap
const SESSION_ID = generateSessionId()

// ---------------------------------------------------------------------------
// Mic-level pulse bar (3 bars, staggered)
// ---------------------------------------------------------------------------

function ListeningPulse() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] h-4 bg-[#c4a76d] rounded-full animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Per-slot enrollment panel (WS-driven)
// ---------------------------------------------------------------------------

interface WsSlotPanelProps {
  slot: 0 | 1
  slotState: WsSlotState
  isActive: boolean
  /** Called to re-activate listening for this slot */
  onActivate: () => void
  onConfirmTyped: (name: string) => void
}

function WsSlotPanel({
  slot,
  slotState,
  isActive,
  onActivate,
  onConfirmTyped,
}: WsSlotPanelProps) {
  const [typedName, setTypedName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const label = `Speaker ${slot + 1}`

  // Auto-focus typed input when give_up
  useEffect(() => {
    if (slotState.phase === 'give_up') inputRef.current?.focus()
  }, [slotState.phase])

  // Confirmed
  if (slotState.phase === 'confirmed') {
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="text-green-400 text-lg leading-none">✓</span>
        <div>
          <p className="text-[11px] text-[#565b70] leading-none mb-0.5">{label}</p>
          <p className="text-[#f1f2f6] font-medium text-sm">Welcome, {slotState.name}</p>
        </div>
      </div>
    )
  }

  // Inactive slot — waiting its turn
  if (!isActive) {
    return (
      <div className="py-2 opacity-35">
        <p className="text-[11px] text-[#565b70]">{label}</p>
        <p className="text-[#7b8096] text-sm italic">Waiting…</p>
      </div>
    )
  }

  // Waiting for enrollment_result (mic is streaming)
  if (slotState.phase === 'waiting') {
    return (
      <div className="py-2">
        <p className="text-[11px] text-[#565b70] mb-1">{label}</p>
        <div className="flex items-center gap-3">
          <ListeningPulse />
          <span className="text-[#c4a76d] text-sm">Say your name…</span>
        </div>
      </div>
    )
  }

  // give_up → typed fallback for this slot
  if (slotState.phase === 'give_up') {
    return (
      <div className="py-2">
        <p className="text-[11px] text-[#565b70] mb-1.5">{label} — type your name</p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && typedName.trim()) onConfirmTyped(typedName.trim())
            }}
            placeholder={slot === 0 ? 'Alex' : 'Sam'}
            className="flex-1 bg-[#0e1017] border border-[#262a3a] px-3 py-2 text-[#f1f2f6] text-sm focus:outline-none focus:border-[#c4a76d] focus:ring-1 focus:ring-[#c4a76d] transition-colors"
          />
          <button
            onClick={() => { if (typedName.trim()) onConfirmTyped(typedName.trim()) }}
            className="px-3 py-2 bg-[#c4a76d] text-[#161925] text-sm font-semibold hover:bg-[#d3b87e] transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    )
  }

  // no_name or duplicate → retry prompt  (duplicate banner is rendered above by EnrollScreen)
  const canRetry = slotState.phase === 'no_name' || slotState.phase === 'duplicate'

  return (
    <div className="py-2">
      <p className="text-[11px] text-[#565b70] mb-1">{label}</p>
      {canRetry && (
        <div className="flex items-center gap-3">
          <button
            onClick={onActivate}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#c4a76d] text-[#c4a76d] text-xs hover:bg-[#1a1d29] transition-colors"
          >
            <span>🎙</span> Try again
          </button>
        </div>
      )}
      {slotState.phase === 'idle' && (
        <div className="flex items-center gap-3">
          <ListeningPulse />
          <span className="text-[#7b8096] text-sm italic">Starting…</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Manual name entry (full fallback — shown when user taps "enter manually")
// ---------------------------------------------------------------------------

interface ManualEntryProps {
  onComplete: (names: [string, string]) => void
}

function ManualEntry({ onComplete }: ManualEntryProps) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#8b90a3]">Enter speaker names</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-[#565b70] mb-1 block">Speaker 1</label>
          <input
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="w-full bg-[#0e1017] border border-[#262a3a] px-3 py-2 text-[#f1f2f6] text-sm focus:outline-none focus:border-[#c4a76d] focus:ring-1 focus:ring-[#c4a76d] transition-colors"
            placeholder="Alex"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-[#565b70] mb-1 block">Speaker 2</label>
          <input
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="w-full bg-[#0e1017] border border-[#262a3a] px-3 py-2 text-[#f1f2f6] text-sm focus:outline-none focus:border-[#c4a76d] focus:ring-1 focus:ring-[#c4a76d] transition-colors"
            placeholder="Sam"
          />
        </div>
      </div>
      <button
        onClick={() => onComplete([a.trim() || 'Speaker A', b.trim() || 'Speaker B'])}
        className="w-full bg-[#c4a76d] hover:bg-[#d3b87e] active:bg-[#b3985e] text-[#161925] font-semibold py-2.5 transition-colors"
      >
        Start live session →
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Enrollment screen (shown after tap)
// ---------------------------------------------------------------------------

interface EnrollScreenProps {
  sessionId: string
  onNamesReady: (names: [string, string], sock: import('@/lib/websocket').MediatorSocket) => void
  onManual: () => void
  /** Called when user clicks Retry on the "failed" banner */
  onRetry: () => void
}

function EnrollScreen({ sessionId, onNamesReady, onManual, onRetry }: EnrollScreenProps) {
  const { state, activate, confirmTyped, sock } = useWsEnrollment(sessionId)
  const hasFailedOnce = useRef(false)
  // Track whether we have completed the initial activate() after first connect
  const activatedRef = useRef(false)

  // ---------------------------------------------------------------------------
  // Activate slot 0 as soon as the socket reaches "connected".
  // If the socket is already connected when this effect runs (fast backend),
  // activate() is called immediately.  If we're still "reconnecting", we wait
  // for the status transition.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (state.wsStatus === 'connected' && !activatedRef.current) {
      activatedRef.current = true
      activate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.wsStatus])

  // Auto-activate slot 1 when it becomes active (socket is already open)
  const prevActiveSlot = useRef(state.activeSlot)
  useEffect(() => {
    if (state.activeSlot === 1 && prevActiveSlot.current === 0) {
      activate()
    }
    prevActiveSlot.current = state.activeSlot
  }, [state.activeSlot, activate])

  // Complete when both names are ready
  useEffect(() => {
    if (state.enrolledNames && sock) {
      onNamesReady(state.enrolledNames, sock)
    }
  }, [state.enrolledNames, sock, onNamesReady])

  // Mark that enrollment has had at least one outcome (enables manual link)
  const slot1Phase = state.slots[0].phase
  if (slot1Phase !== 'idle' && slot1Phase !== 'waiting') hasFailedOnce.current = true

  // Duplicate alert: check if current active slot has a duplicate state
  const activeSlot = state.activeSlot as 0 | 1 | 2
  const activeDuplicate: string | null =
    activeSlot === 0 ? (state.slots[0].duplicateOf ?? null)
    : activeSlot === 1 ? (state.slots[1].duplicateOf ?? null)
    : null

  // ── "failed" state: backend unreachable after 15 attempts ──────────────────
  if (state.wsStatus === 'failed') {
    return (
      <div className="space-y-3">
        <div className="px-3 py-3 bg-[#241419] border border-[#4a2530] text-[#e39aa8] text-xs rounded">
          <p className="font-semibold mb-1">⚠️ Backend unreachable</p>
          <p className="text-[#c4878f]">Start uvicorn and then tap Retry.</p>
        </div>
        <button
          onClick={onRetry}
          className="w-full bg-[#c4a76d] hover:bg-[#d3b87e] active:bg-[#b3985e] text-[#161925] font-semibold py-2 text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  // ── "reconnecting / connecting" state: spinner while dialing ───────────────
  if (state.wsStatus === 'connecting' || state.wsStatus === 'reconnecting') {
    return (
      <div className="flex items-center gap-3 py-4">
        <span className="animate-spin text-[#c4a76d] text-lg leading-none">⏳</span>
        <span className="text-[#8b90a3] text-sm">
          Waiting for server… (make sure uvicorn is running)
        </span>
      </div>
    )
  }

  // ── Connected: normal enrollment UI ────────────────────────────────────────
  const errorMsg = state.micError || state.wsError

  return (
    <div className="space-y-1">
      {/* Section header + mute hint */}
      <p className="text-xs text-[#8b90a3] mb-3">
        Say your name into the microphone when prompted
      </p>

      {/* Error banner (mic / WS) */}
      {errorMsg && (
        <div className="mb-3 px-3 py-2 bg-[#241419] border border-[#4a2530] text-[#e39aa8] text-xs rounded">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Duplicate alert */}
      {activeDuplicate && (
        <div className="mb-3 px-3 py-2.5 bg-[#1f1020] border border-[#6b2d5e] rounded flex items-start gap-2">
          <span className="text-[#e39aa8] text-base leading-none mt-px">🔊</span>
          <p className="text-[#e39aa8] text-xs leading-relaxed">
            This voice sounds like <strong>{activeDuplicate}</strong>, who is already added.
            Please have the <em>other</em> person say their name.
          </p>
        </div>
      )}

      {/* Slot panels */}
      {([0, 1] as const).map((i) => (
        <WsSlotPanel
          key={i}
          slot={i}
          slotState={state.slots[i]}
          isActive={state.activeSlot === i}
          onActivate={activate}
          onConfirmTyped={confirmTyped}
        />
      ))}

      {/* Manual entry link — revealed only after at least one enrollment outcome */}
      {hasFailedOnce.current && (
        <div className="pt-3 border-t border-[#1e2130]">
          <button
            onClick={onManual}
            className="text-xs text-[#565b70] hover:text-[#8b90a3] underline transition-colors"
          >
            Enter names manually instead
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter()

  type Mode = 'splash' | 'enrolling' | 'manual' | 'launching'

  const [mode, setMode] = useState<Mode>('splash')
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
  const [demoState, setDemoState] = useState<'idle' | 'running' | 'error'>('idle')
  const [demoError, setDemoError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // ---------------------------------------------------------------------------
  // TEST MODE tap handler
  // Navigates directly to the session view with generic speaker labels.
  // The session page's useEffect owns the WebSocket + mic — it connects,
  // sends start_session, and starts the AudioWorklet all on one persistent
  // socket. Nothing mic-related runs here.
  // ---------------------------------------------------------------------------
  const handleTestTap = useCallback(() => {
    if (mode !== 'splash') return
    const [a, b] = TEST_SPEAKERS
    router.push(
      `/session/${SESSION_ID}?speakers=${encodeURIComponent(JSON.stringify([a, b]))}`,
    )
  }, [mode, router])

  // ---------------------------------------------------------------------------
  // ENROLLMENT MODE tap handler — the one required user gesture.
  // The socket will have been dialing in the background (created by
  // useWsEnrollment on EnrollScreen mount), so by the time the user taps
  // "Tap to begin" the WS may already be connected.
  // ---------------------------------------------------------------------------
  const handleEnrollTap = useCallback(() => {
    if (mode !== 'splash') return
    setMode('enrolling')
  }, [mode])

  // Route taps to the active mode
  const handleTap = TEST_MODE ? handleTestTap : handleEnrollTap

  // ---------------------------------------------------------------------------
  // Retry — unmount / remount EnrollScreen with a fresh session so that
  // useWsEnrollment creates a brand-new socket and starts dialing again.
  // We flip back to 'splash' first (unmounts EnrollScreen, tearing down the
  // failed socket) then immediately back to 'enrolling'.
  // ---------------------------------------------------------------------------
  const handleRetry = useCallback(() => {
    setMode('splash')
    // One tick so React can unmount EnrollScreen before re-mounting it
    setTimeout(() => setMode('enrolling'), 0)
  }, [])

  // ---------------------------------------------------------------------------
  // Enrollment complete — names + already-open socket ready
  // ---------------------------------------------------------------------------
  const handleNamesReady = useCallback(
    async (
      names: [string, string],
      sock: import('@/lib/websocket').MediatorSocket,
    ) => {
      const [a, b] = names
      setMode('launching')

      try {
        // Socket is already open (created during enrollment)
        sock.send({ type: 'start_session', speakers: [a, b] })

        for (const f of evidenceFiles) {
          const form = new FormData()
          form.append('file', f)
          await fetch(`http://localhost:8000/upload-evidence/${SESSION_ID}`, {
            method: 'POST', body: form,
          }).catch(console.warn)
        }

        sock.disconnect()
        router.push(
          `/session/${SESSION_ID}?speakers=${encodeURIComponent(JSON.stringify([a, b]))}`,
        )
      } catch (err) {
        console.error('Session launch failed:', err)
        setMode('manual')
      }
    },
    [evidenceFiles, router],
  )

  // ---------------------------------------------------------------------------
  // Manual entry complete
  // ---------------------------------------------------------------------------
  const handleManualComplete = useCallback(
    async (names: [string, string]) => {
      const [a, b] = names
      const id = generateSessionId()   // fresh id for manual path
      setMode('launching')

      try {
        const { connect } = await import('@/lib/websocket')
        const sock = connect(id)
        await new Promise<void>((res, rej) => {
          const t = setTimeout(() => rej(new Error('WS timeout')), 5000)
          const unsub = sock.onStatus((s) => {
            if (s === 'connected') { clearTimeout(t); unsub(); res() }
            if (s === 'failed')    { clearTimeout(t); unsub(); rej(new Error('Backend not reachable')) }
          })
        })
        sock.send({ type: 'start_session', speakers: [a, b] })

        for (const f of evidenceFiles) {
          const form = new FormData()
          form.append('file', f)
          await fetch(`http://localhost:8000/upload-evidence/${id}`, {
            method: 'POST', body: form,
          }).catch(console.warn)
        }

        sock.disconnect()
        router.push(
          `/session/${id}?speakers=${encodeURIComponent(JSON.stringify([a, b]))}`,
        )
      } catch (err) {
        console.error('Manual session launch failed:', err)
        setMode('manual')
      }
    },
    [evidenceFiles, router],
  )

  // ---------------------------------------------------------------------------
  // Scripted demo
  // ---------------------------------------------------------------------------
  async function handleDemo() {
    if (demoState === 'running') return
    setDemoState('running')
    setDemoError('')

    const id = generateSessionId()

    try {
      const { connect } = await import('@/lib/websocket')
      const sock = connect(id)
      await new Promise<void>((res, rej) => {
        const t = setTimeout(
          () => rej(new Error('Backend not reachable — is uvicorn running?')),
          6000,
        )
        const unsub = sock.onStatus((s) => {
          if (s === 'connected') { clearTimeout(t); unsub(); res() }
          if (s === 'failed')    { clearTimeout(t); unsub(); rej(new Error('Backend not reachable — is uvicorn running?')) }
        })
      })

      sock.send({ type: 'start_session', speakers: DEMO_SPEAKERS })

      for (const path of DEMO_EVIDENCE_FILES) {
        const res = await fetch(path)
        if (!res.ok) continue
        const blob = await res.blob()
        const filename = path.split('/').pop()!
        const form = new FormData()
        form.append('file', new File([blob], filename))
        await fetch(`http://localhost:8000/upload-evidence/${id}`, {
          method: 'POST', body: form,
        }).catch(console.warn)
      }

      sessionStorage.setItem('demo_session_id', id)
      sessionStorage.setItem('demo_speakers', JSON.stringify(DEMO_SPEAKERS))

      router.push(
        `/session/${id}?speakers=${encodeURIComponent(JSON.stringify(DEMO_SPEAKERS))}&demo=1`,
      )
      sock.disconnect()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setDemoState('error')
      setDemoError(msg)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <main className="h-screen overflow-hidden flex flex-col items-center justify-center px-4 py-4 bg-[#10121a]">

      {/* ================================================================
          SPLASH — full-screen tap target
          ================================================================ */}
      {mode === 'splash' && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer select-none z-40"
          onClick={handleTap}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleTap()}
          aria-label="Tap to begin"
        >
          {/* Background keeps the dark app feel */}
          <div className="absolute inset-0 bg-[#10121a]" />

          <div className="relative text-center max-w-sm px-6">
            <h1 className="font-serif text-[2.4rem] leading-tight text-[#f1f2f6] mb-3">
              Argument Mediator
            </h1>
            <p className="text-[#c4a76d] text-[1.15rem] font-medium mb-2">
              Tap to begin
            </p>
            <p className="text-[#565b70] text-sm leading-relaxed">
              Make sure both people are in the room
            </p>
          </div>
        </div>
      )}

      {/* ================================================================
          ACTIVE — hero + session card
          ================================================================ */}
      {mode !== 'splash' && (
        <>
          {/* Hero */}
          <div className="mb-4 text-center max-w-lg">
            <h1 className="font-serif text-[1.9rem] leading-tight text-[#f1f2f6] mb-2">
              Argument Mediator
            </h1>
            <p className="text-[#8b90a3] text-[13px] leading-relaxed">
              Transcribes both sides live, extracts factual claims, matches them
              against evidence, and produces a verdict report.
            </p>
          </div>

          {/* Session card */}
          <div className="w-full max-w-md bg-[#161925] border border-[#262a3a] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
            <h2 className="text-[#f1f2f6] font-serif text-lg mb-4">New session</h2>

            {/* Launching */}
            {mode === 'launching' && (
              <div className="flex items-center gap-3 py-4">
                <span className="animate-spin text-[#c4a76d]">⏳</span>
                <span className="text-[#8b90a3] text-sm">Starting session…</span>
              </div>
            )}

            {/* Enrollment */}
            {mode === 'enrolling' && (
              <EnrollScreen
                sessionId={SESSION_ID}
                onNamesReady={handleNamesReady}
                onManual={() => setMode('manual')}
                onRetry={handleRetry}
              />
            )}

            {/* Manual fallback */}
            {mode === 'manual' && (
              <ManualEntry onComplete={handleManualComplete} />
            )}

            {/* Evidence upload (enrollment + manual modes only) */}
            {(mode === 'enrolling' || mode === 'manual') && (
              <div className="mt-4 pt-4 border-t border-[#1e2130]">
                <label className="text-xs text-[#8b90a3] mb-1.5 block">
                  Evidence files{' '}
                  <span className="text-[#565b70]">(optional · txt, md, csv, pdf)</span>
                </label>
                <div
                  className="border border-dashed border-[#262a3a] p-3 text-center cursor-pointer hover:border-[#c4a76d] transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {evidenceFiles.length === 0 ? (
                    <p className="text-[#8b90a3] text-xs">Click or drag files here</p>
                  ) : (
                    <ul className="text-xs text-[#c4a76d] space-y-1">
                      {evidenceFiles.map((f) => (
                        <li key={f.name}>📎 {f.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".txt,.md,.csv,.pdf"
                  onChange={(e) => setEvidenceFiles(Array.from(e.target.files ?? []))}
                />
              </div>
            )}
          </div>

          {/* Demo button */}
          <div className="mt-4 w-full max-w-md">
            <div className="relative flex items-center mb-3">
              <div className="flex-1 border-t border-[#262a3a]" />
              <span className="px-3 text-xs text-[#565b70]">or try the demo</span>
              <div className="flex-1 border-t border-[#262a3a]" />
            </div>

            {demoState === 'error' && (
              <div className="mb-3 px-4 py-2.5 bg-[#241419] border border-[#4a2530] text-[#e39aa8] text-xs">
                ⚠️ {demoError}
              </div>
            )}

            <button
              onClick={handleDemo}
              disabled={demoState === 'running'}
              className="w-full border border-[#3a3f54] text-[#c4a76d] hover:bg-[#1a1d29] disabled:opacity-50 font-medium py-2.5 transition-colors text-sm"
            >
              {demoState === 'running' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-pulse">●</span> Demo running…
                </span>
              ) : (
                '▶ Run scripted demo (no microphone needed)'
              )}
            </button>
            <p className="mt-2 text-center text-xs text-[#565b70]">
              Streams a pre-recorded argument through the full pipeline
            </p>
          </div>
        </>
      )}
    </main>
  )
}
