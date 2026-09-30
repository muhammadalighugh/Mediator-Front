'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, ShieldCheck, Loader2, Lock } from 'lucide-react'
import { useWsEnrollment, type WsSlotState } from '@/lib/useWsEnrollment'
import PastSessions from '@/components/PastSessions'
import { useRequireAuth, getAuthToken } from '@/lib/useRequireAuth'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_MODE: boolean =
  process.env.NEXT_PUBLIC_TEST_MODE !== 'false'

const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8000'

const TEST_SPEAKERS: [string, string] = ['Speaker 1', 'Speaker 2']

const DEMO_SPEAKERS = ['Speaker 1', 'Speaker 2']
const DEMO_EVIDENCE_FILES = [
  '/demo/sample_evidence/expense_log.csv',
  '/demo/sample_evidence/messages.txt',
]

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const SESSION_ID = generateSessionId()

// ---------------------------------------------------------------------------
// Mic pulse (green theme)
// ---------------------------------------------------------------------------

function ListeningPulse() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] h-4 bg-[#003017] rounded-full animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Mic permission checker
// ---------------------------------------------------------------------------

type MicStatus = 'idle' | 'checking' | 'granted' | 'denied' | 'unavailable'

function MicCheck({ onGranted }: { onGranted: () => void }) {
  const [status, setStatus] = useState<MicStatus>('idle')
  const streamRef = useRef<MediaStream | null>(null)

  // On mount: silently read existing permission state (no prompt)
  useEffect(() => {
    if (!navigator.permissions) return
    navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
      if (result.state === 'granted') setStatus('granted')
      if (result.state === 'denied')  setStatus('denied')
      result.onchange = () => {
        if (result.state === 'granted') setStatus('granted')
        if (result.state === 'denied')  setStatus('denied')
      }
    }).catch(() => {/* permissions API not supported — ignore */})
  }, [])

  // Clean up test stream on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }, [])

  async function requestMic() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      return
    }
    setStatus('checking')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Keep stream alive briefly then release — we only need the permission
      streamRef.current = stream
      setTimeout(() => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }, 500)
      setStatus('granted')
    } catch {
      setStatus('denied')
    }
  }

  // Auto-notify parent when granted
  useEffect(() => {
    if (status === 'granted') onGranted()
  }, [status, onGranted])

  if (status === 'granted') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-[#003017]/8 border border-[#003017]/20 rounded-lg text-sm text-[#003017] font-medium">
        <ShieldCheck size={16} strokeWidth={2} />
        Microphone ready
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="w-full max-w-xs text-center space-y-3">
        <div className="flex flex-col items-center gap-2 px-4 py-4 bg-red-50 border border-red-200 rounded-lg">
          <MicOff size={28} color="#dc2626" strokeWidth={1.6} />
          <p className="text-red-700 text-sm font-semibold">Microphone blocked</p>
          <p className="text-red-600 text-xs leading-relaxed">
            Click the <Lock size={11} className="inline mb-0.5" /> icon in your browser&apos;s address bar, set
            Microphone to <strong>Allow</strong>, then refresh the page.
          </p>
        </div>
        <button
          onClick={requestMic}
          className="w-full border border-[#003017] text-[#003017] text-sm font-medium py-2 hover:bg-[#003017]/5 transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  if (status === 'unavailable') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
        <MicOff size={16} strokeWidth={2} />
        No microphone detected on this device.
      </div>
    )
  }

  return (
    <button
      onClick={requestMic}
      disabled={status === 'checking'}
      className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-[#003017] text-[#003017] text-sm font-semibold hover:bg-[#003017] hover:text-white transition-colors disabled:opacity-60 rounded-sm"
    >
      {status === 'checking' ? (
        <>
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
          Checking…
        </>
      ) : (
        <>
          <Mic size={16} strokeWidth={2} />
          Check microphone
        </>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Per-slot enrollment panel
// ---------------------------------------------------------------------------

interface WsSlotPanelProps {
  slot: 0 | 1
  slotState: WsSlotState
  isActive: boolean
  onActivate: () => void
  onConfirmTyped: (name: string) => void
}

function WsSlotPanel({ slot, slotState, isActive, onActivate, onConfirmTyped }: WsSlotPanelProps) {
  const [typedName, setTypedName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const label = `Speaker ${slot + 1}`

  useEffect(() => {
    if (slotState.phase === 'give_up') inputRef.current?.focus()
  }, [slotState.phase])

  if (slotState.phase === 'confirmed') {
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="text-[#003017] text-lg leading-none">✓</span>
        <div>
          <p className="text-[11px] text-[#5A6A75] leading-none mb-0.5">{label}</p>
          <p className="text-[#22303C] font-medium text-sm">Welcome, {slotState.name}</p>
        </div>
      </div>
    )
  }

  if (!isActive) {
    return (
      <div className="py-2 opacity-40">
        <p className="text-[11px] text-[#5A6A75]">{label}</p>
        <p className="text-[#8A9BAA] text-sm italic">Waiting…</p>
      </div>
    )
  }

  if (slotState.phase === 'waiting') {
    return (
      <div className="py-2">
        <p className="text-[11px] text-[#5A6A75] mb-1">{label}</p>
        <div className="flex items-center gap-3">
          <ListeningPulse />
          <span className="text-[#003017] text-sm font-medium">Say your name…</span>
        </div>
      </div>
    )
  }

  if (slotState.phase === 'give_up') {
    return (
      <div className="py-2">
        <p className="text-[11px] text-[#5A6A75] mb-1.5">{label} — type your name</p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && typedName.trim()) onConfirmTyped(typedName.trim()) }}
            placeholder={slot === 0 ? 'Alex' : 'Sam'}
            className="flex-1 bg-white border border-[#E2E8ED] px-3 py-2 text-[#22303C] text-sm focus:outline-none focus:border-[#003017] focus:ring-1 focus:ring-[#003017] transition-colors"
          />
          <button
            onClick={() => { if (typedName.trim()) onConfirmTyped(typedName.trim()) }}
            className="px-3 py-2 bg-[#003017] text-white text-sm font-semibold hover:bg-[#004d26] transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    )
  }

  const canRetry = slotState.phase === 'no_name' || slotState.phase === 'duplicate'

  return (
    <div className="py-2">
      <p className="text-[11px] text-[#5A6A75] mb-1">{label}</p>
      {canRetry && (
        <button
          onClick={onActivate}
          className="flex items-center gap-2 px-3 py-1.5 border border-[#003017] text-[#003017] text-xs hover:bg-[#003017]/5 transition-colors"
        >
          🎙 Try again
        </button>
      )}
      {slotState.phase === 'idle' && (
        <div className="flex items-center gap-3">
          <ListeningPulse />
          <span className="text-[#8A9BAA] text-sm italic">Starting…</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Manual name entry
// ---------------------------------------------------------------------------

interface ManualEntryProps {
  onComplete: (names: [string, string]) => void
  prefillName?: string
}

function ManualEntry({ onComplete, prefillName }: ManualEntryProps) {
  const [a, setA] = useState(prefillName ?? '')
  const [b, setB] = useState('')

  useEffect(() => {
    if (prefillName) setA((prev) => prev || prefillName)
  }, [prefillName])

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#5A6A75]">Enter speaker names</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-[#5A6A75] mb-1 block">Speaker 1</label>
          <input
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="w-full bg-white border border-[#E2E8ED] px-3 py-2 text-[#22303C] text-sm focus:outline-none focus:border-[#003017] focus:ring-1 focus:ring-[#003017] transition-colors"
            placeholder="Alex"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-[#5A6A75] mb-1 block">Speaker 2</label>
          <input
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="w-full bg-white border border-[#E2E8ED] px-3 py-2 text-[#22303C] text-sm focus:outline-none focus:border-[#003017] focus:ring-1 focus:ring-[#003017] transition-colors"
            placeholder="Sam"
          />
        </div>
      </div>
      <button
        onClick={() => onComplete([a.trim() || 'Speaker A', b.trim() || 'Speaker B'])}
        className="w-full bg-[#003017] hover:bg-[#004d26] active:bg-[#002d16] text-white font-semibold py-2.5 transition-colors text-sm"
      >
        Start live session →
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Enrollment screen
// ---------------------------------------------------------------------------

interface EnrollScreenProps {
  sessionId: string
  userEmail?: string
  token?: string
  onNamesReady: (names: [string, string], sock: import('@/lib/websocket').MediatorSocket) => void
  onManual: () => void
  onRetry: () => void
}

function EnrollScreen({ sessionId, userEmail, token, onNamesReady, onManual, onRetry }: EnrollScreenProps) {
  const { state, activate, confirmTyped, sock } = useWsEnrollment(sessionId, userEmail, token)
  const hasFailedOnce = useRef(false)
  const activatedRef = useRef(false)

  useEffect(() => {
    if (state.wsStatus === 'connected' && !activatedRef.current) {
      activatedRef.current = true
      activate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.wsStatus])

  const prevActiveSlot = useRef(state.activeSlot)
  useEffect(() => {
    if (state.activeSlot === 1 && prevActiveSlot.current === 0) activate()
    prevActiveSlot.current = state.activeSlot
  }, [state.activeSlot, activate])

  useEffect(() => {
    if (state.enrolledNames && sock) onNamesReady(state.enrolledNames, sock)
  }, [state.enrolledNames, sock, onNamesReady])

  const slot1Phase = state.slots[0].phase
  if (slot1Phase !== 'idle' && slot1Phase !== 'waiting') hasFailedOnce.current = true

  const activeSlot = state.activeSlot as 0 | 1 | 2
  const activeDuplicate: string | null =
    activeSlot === 0 ? (state.slots[0].duplicateOf ?? null)
    : activeSlot === 1 ? (state.slots[1].duplicateOf ?? null)
    : null

  if (state.wsStatus === 'failed') {
    return (
      <div className="space-y-3">
        <div className="px-3 py-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
          <p className="font-semibold mb-1">⚠️ Backend unreachable</p>
          <p className="text-red-600">Start uvicorn and then tap Retry.</p>
        </div>
        <button
          onClick={onRetry}
          className="w-full bg-[#003017] hover:bg-[#004d26] text-white font-semibold py-2 text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (state.wsStatus === 'connecting' || state.wsStatus === 'reconnecting') {
    return (
      <div className="flex items-center gap-3 py-4">
        <span className="animate-spin text-[#003017] text-lg leading-none">⏳</span>
        <span className="text-[#5A6A75] text-sm">
          Waiting for server… (make sure uvicorn is running)
        </span>
      </div>
    )
  }

  const errorMsg = state.micError || state.wsError

  return (
    <div className="space-y-1">
      <p className="text-xs text-[#5A6A75] mb-3">
        Say your name into the microphone when prompted
      </p>

      {errorMsg && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
          ⚠️ {errorMsg}
        </div>
      )}

      {activeDuplicate && (
        <div className="mb-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded flex items-start gap-2">
          <span className="text-amber-600 text-base leading-none mt-px">🔊</span>
          <p className="text-amber-700 text-xs leading-relaxed">
            This voice sounds like <strong>{activeDuplicate}</strong>, who is already added.
            Please have the <em>other</em> person say their name.
          </p>
        </div>
      )}

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

      {hasFailedOnce.current && (
        <div className="pt-3 border-t border-[#E2E8ED]">
          <button
            onClick={onManual}
            className="text-xs text-[#5A6A75] hover:text-[#003017] underline transition-colors"
          >
            Enter names manually instead
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Start page
// ---------------------------------------------------------------------------

export default function StartPage() {
  const router = useRouter()
  const authUser = useRequireAuth()

  type Mode = 'splash' | 'enrolling' | 'manual' | 'launching'

  const [mode, setMode] = useState<Mode>('splash')
  const [micGranted, setMicGranted] = useState(false)
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
  const [demoState, setDemoState] = useState<'idle' | 'running' | 'error'>('idle')
  const [demoError, setDemoError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const userName = authUser?.name ?? null
  const userEmail = authUser?.email ?? ''

  function handleSignOut() {
    localStorage.removeItem('am_token')
    localStorage.removeItem('am_user')
    router.push('/')
  }

  const handleTestTap = useCallback(() => {
    if (mode !== 'splash') return
    const [a, b] = TEST_SPEAKERS
    router.push(`/session/${SESSION_ID}?speakers=${encodeURIComponent(JSON.stringify([a, b]))}`)
  }, [mode, router])

  const handleEnrollTap = useCallback(() => {
    if (mode !== 'splash') return
    setMode('enrolling')
  }, [mode])

  const handleTap = TEST_MODE ? handleTestTap : handleEnrollTap

  const handleRetry = useCallback(() => {
    setMode('splash')
    setTimeout(() => setMode('enrolling'), 0)
  }, [])

  // The session page owns the WS lifecycle (start_session + mic capture).
  // The start page only needs to upload any pre-selected evidence files, then
  // navigate. The enrollment socket is torn down automatically when this page
  // unmounts.
  const handleNamesReady = useCallback(
    async (names: [string, string], _sock: import('@/lib/websocket').MediatorSocket) => {
      const [a, b] = names
      setMode('launching')
      try {
        for (const f of evidenceFiles) {
          const form = new FormData()
          form.append('file', f)
          await fetch(`${API_BASE}/upload-evidence/${SESSION_ID}`, { method: 'POST', body: form, headers: { Authorization: `Bearer ${getAuthToken()}` } }).catch(console.warn)
        }
        router.push(`/session/${SESSION_ID}?speakers=${encodeURIComponent(JSON.stringify([a, b]))}`)
      } catch (err) {
        console.error('Session launch failed:', err)
        setMode('manual')
      }
    },
    [evidenceFiles, router],
  )

  const handleManualComplete = useCallback(
    async (names: [string, string]) => {
      const [a, b] = names
      const id = generateSessionId()
      setMode('launching')
      try {
        for (const f of evidenceFiles) {
          const form = new FormData()
          form.append('file', f)
          await fetch(`${API_BASE}/upload-evidence/${id}`, { method: 'POST', body: form, headers: { Authorization: `Bearer ${getAuthToken()}` } }).catch(console.warn)
        }
        router.push(`/session/${id}?speakers=${encodeURIComponent(JSON.stringify([a, b]))}`)
      } catch (err) {
        console.error('Manual session launch failed:', err)
        setMode('manual')
      }
    },
    [evidenceFiles, router],
  )

  async function handleDemo() {
    if (demoState === 'running') return
    setDemoState('running')
    setDemoError('')
    const id = generateSessionId()
    try {
      const { connect } = await import('@/lib/websocket')
      const sock = connect(id, userEmail, getAuthToken())
      await new Promise<void>((res, rej) => {
        const t = setTimeout(() => rej(new Error('Backend not reachable — is uvicorn running?')), 6000)
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
        await fetch(`${API_BASE}/upload-evidence/${id}`, { method: 'POST', body: form, headers: { Authorization: `Bearer ${getAuthToken()}` } }).catch(console.warn)
      }
      sessionStorage.setItem('demo_session_id', id)
      sessionStorage.setItem('demo_speakers', JSON.stringify(DEMO_SPEAKERS))
      router.push(`/session/${id}?speakers=${encodeURIComponent(JSON.stringify(DEMO_SPEAKERS))}&demo=1`)
      sock.disconnect()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setDemoState('error')
      setDemoError(msg)
    }
  }

  if (userName === null) return null

  return (
    <main className="min-h-screen bg-white text-[#22303C] flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="w-full border-b border-[#E2E8ED] bg-white">
        <div className="flex items-center justify-between px-6 py-3 max-w-5xl mx-auto">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-sm bg-[#003017] flex items-center justify-center">
              <img src="/logo.png" alt="MediFact logo" className="w-3.5 h-3.5 object-contain" />
            </div>
            <span className="text-[#003017] text-sm font-semibold">MediFact</span>
          </a>
          {/* User strip */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#5A6A75]">
              Signed in as <span className="text-[#003017] font-medium">{userName}</span>
            </span>
            <span className="text-[#E2E8ED]">·</span>
            <button
              onClick={handleSignOut}
              className="text-xs text-[#5A6A75] hover:text-[#003017] underline transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Page body ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">

        {/* ── SPLASH ─────────────────────────────────────────────────── */}
        {mode === 'splash' && (
          <div className="flex flex-col items-center text-center gap-6">

            {/* Logo + title */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-md bg-[#003017] flex items-center justify-center shadow-lg">
                <img src="/logo.png" alt="MediFact logo" className="w-8 h-8 object-contain" />
              </div>
              <h1 className="font-bebas text-[3rem] leading-tight text-[#003017] tracking-wide uppercase">
                MediFact
              </h1>
            </div>

            {/* Mic check */}
            <MicCheck onGranted={() => setMicGranted(true)} />

            {/* Tap to begin — only shown once mic is granted */}
            {micGranted && (
              <div
                className="flex flex-col items-center gap-1 cursor-pointer select-none"
                onClick={handleTap}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleTap()}
                aria-label="Tap to begin"
              >
                <p className="text-[#003017] text-[1rem] font-semibold">
                  Tap to begin
                </p>
                <p className="text-[#5A6A75] text-sm">
                  Make sure both people are in the room
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVE modes ────────────────────────────────────────────── */}
        {mode !== 'splash' && (
          <>
            {/* Hero text */}
            <div className="mb-6 text-center max-w-lg">
              <h1 className="font-bebas text-[2.5rem] leading-tight text-[#003017] mb-1 tracking-wide uppercase">
                MediFact
              </h1>
              <p className="text-[#5A6A75] text-sm leading-relaxed">
                Transcribes both sides live, extracts factual claims, matches them
                against evidence, and produces a verdict report.
              </p>
            </div>

            {/* Session card */}
            <div className="w-full max-w-md bg-white border border-[#E2E8ED] p-6 shadow-sm">
              <h2 className="text-[#003017] font-semibold text-base mb-4">New session</h2>

              {/* Launching */}
              {mode === 'launching' && (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 size={16} strokeWidth={2} className="animate-spin text-[#003017]" />
                  <span className="text-[#5A6A75] text-sm">Starting session…</span>
                </div>
              )}

              {/* Enrollment */}
              {mode === 'enrolling' && (
                <EnrollScreen
                  sessionId={SESSION_ID}
                  userEmail={userEmail || undefined}
                  token={getAuthToken()}
                  onNamesReady={handleNamesReady}
                  onManual={() => setMode('manual')}
                  onRetry={handleRetry}
                />
              )}

              {/* Manual fallback */}
              {mode === 'manual' && (
                <ManualEntry
                  onComplete={handleManualComplete}
                  prefillName={userName ?? undefined}
                />
              )}

              {/* Evidence upload */}
              {(mode === 'enrolling' || mode === 'manual') && (
                <div className="mt-4 pt-4 border-t border-[#E2E8ED]">
                  <label className="text-xs text-[#5A6A75] mb-1.5 block">
                    Evidence files{' '}
                    <span className="text-[#8A9BAA]">(optional · txt, md, csv, pdf)</span>
                  </label>
                  <div
                    className="border border-dashed border-[#D1D9E0] p-3 text-center cursor-pointer hover:border-[#003017] transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    {evidenceFiles.length === 0 ? (
                      <p className="text-[#8A9BAA] text-xs">Click or drag files here</p>
                    ) : (
                      <ul className="text-xs text-[#003017] space-y-1">
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

            {/* Demo section */}
            <div className="mt-4 w-full max-w-md">
              <div className="relative flex items-center mb-3">
                <div className="flex-1 border-t border-[#E2E8ED]" />
                <span className="px-3 text-xs text-[#8A9BAA]">or try the demo</span>
                <div className="flex-1 border-t border-[#E2E8ED]" />
              </div>

              {demoState === 'error' && (
                <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-xs">
                  ⚠️ {demoError}
                </div>
              )}

              <button
                onClick={handleDemo}
                disabled={demoState === 'running'}
                className="w-full border border-[#003017] text-[#003017] hover:bg-[#003017] hover:text-white disabled:opacity-50 font-medium py-2.5 transition-colors text-sm"
              >
                {demoState === 'running' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-pulse">●</span> Demo running…
                  </span>
                ) : (
                  '▶ Run scripted demo (no microphone needed)'
                )}
              </button>
              <p className="mt-2 text-center text-xs text-[#8A9BAA]">
                Streams a pre-recorded argument through the full pipeline
              </p>
            </div>
          </>
        )}

        {/* Past sessions */}
        {mode === 'splash' && userEmail && (
          <div className="mt-4 w-full max-w-md">
            <PastSessions email={userEmail} />
          </div>
        )}
      </div>
    </main>
  )
}
