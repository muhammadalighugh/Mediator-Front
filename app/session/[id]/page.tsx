'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Pause, Play } from 'lucide-react'
import LiveTranscript from '@/components/LiveTranscript'
import ClaimBoard from '@/components/ClaimBoard'
import EvidenceUpload from '@/components/EvidenceUpload'
import ContradictionAlert from '@/components/ContradictionAlert'
import MediationReportView from '@/components/MediationReport'
import type { Claim, MediationReport, Speaker } from '@/lib/types'
import { useRequireAuth, getAuthToken } from '@/lib/useRequireAuth'
import { connect, type MediatorSocket } from '@/lib/websocket'
import { MicCapture } from '@/lib/micCapture'

const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8000'

/** Poll GET /report/{sessionId} until it returns 200, then call onReport. */
async function pollForReport(
  sessionId: string,
  token: string,
  onReport: (r: MediationReport) => void,
  signal: AbortSignal,
): Promise<void> {
  const INTERVAL_MS  = 2_000   // check every 2 s
  const MAX_ATTEMPTS = 60      // give up after ~2 min

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (signal.aborted) return
    await new Promise<void>((res) => {
      const t = setTimeout(res, INTERVAL_MS)
      signal.addEventListener('abort', () => { clearTimeout(t); res() }, { once: true })
    })
    if (signal.aborted) return
    try {
      const res = await fetch(`${API_BASE}/report/${sessionId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal,
      })
      if (res.ok) {
        const report = await res.json() as MediationReport
        onReport(report)
        return
      }
      // 404 = not ready yet; anything else is unexpected but keep trying
    } catch {
      if (signal.aborted) return
      // network error — keep polling
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TranscriptEntry {
  id: string
  speaker_id: string | null
  text: string
  is_final: boolean
  start_ms: number
}

// ---------------------------------------------------------------------------
// Speaker colours — assigned by index position
// ---------------------------------------------------------------------------

const SPEAKER_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

const UNKNOWN_SPEAKER: Speaker = { id: 'speaker_unknown', display_name: 'Unknown', color: '#7b8096' }

function buildSpeakers(names: string[]): Speaker[] {
  return names.map((name, i) => ({
    id: `speaker_${i}`,
    display_name: name,
    color: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
  }))
}

function buildSpeakerMap(speakers: Speaker[]): Map<string, Speaker> {
  return new Map([...speakers, UNKNOWN_SPEAKER].map((s) => [s.id, s]))
}

// ---------------------------------------------------------------------------
// Session page — connects WS, sends start_session, streams mic audio live
// ---------------------------------------------------------------------------

export default function SessionPage() {
  useRequireAuth()

  const params       = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const sessionId    = params.id

  // Parse speaker names from ?speakers=[...] query param (initial / fallback values)
  const initialSpeakers: Speaker[] = (() => {
    try {
      const raw = searchParams.get('speakers')
      if (raw) return buildSpeakers(JSON.parse(raw) as string[])
    } catch { /* ignore */ }
    return buildSpeakers(['Speaker 1', 'Speaker 2'])
  })()

  // ── State ──────────────────────────────────────────────────────────────────
  const [speakers,       setSpeakers]       = useState<Speaker[]>(initialSpeakers)
  const [transcript,     setTranscript]     = useState<TranscriptEntry[]>([])
  const [claims,         setClaims]         = useState<Claim[]>([])
  const [report,         setReport]         = useState<MediationReport | null>(null)
  const [showReport,     setShowReport]     = useState(false)
  const [paused,         setPaused]         = useState(false)
  const [sessionEnded,   setSessionEnded]   = useState(false)
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)
  const [wsStatus,       setWsStatus]       = useState<string>('connecting')
  const [micError,       setMicError]       = useState<string | null>(null)

  // speakerMap is derived from speakers state — recomputed on every speakers update
  const speakerMap = buildSpeakerMap(speakers)

  const sockRef    = useRef<MediatorSocket | null>(null)
  const micRef     = useRef<MicCapture | null>(null)
  const pausedRef  = useRef(false)
  /** AbortController for the report-polling loop — cancelled on unmount or WS delivery. */
  const pollAbortRef = useRef<AbortController | null>(null)

  /** Called by both the WS path and the poll path — idempotent. */
  const receiveReport = useCallback((r: MediationReport) => {
    pollAbortRef.current?.abort()
    setReport(r)
    setShowReport(true)
  }, [])

  // Sync paused → mic in real time (no restart needed — MicCapture just drops frames)
  useEffect(() => {
    pausedRef.current = paused
    micRef.current?.setMuted(paused)
  }, [paused])

  // ── WebSocket + mic lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    let email = ''
    let token = ''
    try {
      email = JSON.parse(localStorage.getItem('am_user') || '{}')?.email ?? ''
      token = getAuthToken() ?? ''
    } catch { /* ignore */ }

    const sock = connect(sessionId, email, token)
    sockRef.current = sock

    const unsubStatus = sock.onStatus((s) => {
      setWsStatus(s)
      // Once connected: send start_session and start the mic.
      // speakerNames comes from the URL query param — the backend will
      // override these with real enrolled names via speakers_updated.
      if (s === 'connected') {
        const urlNames = (() => {
          try {
            const raw = searchParams.get('speakers')
            if (raw) return JSON.parse(raw) as string[]
          } catch { /* ignore */ }
          return ['Speaker 1', 'Speaker 2']
        })()
        sock.send({ type: 'start_session', speakers: urlNames })
        _startMic(sock)
      }
    })

    const unsubMsg = sock.on((msg) => {
      if (msg.type === 'speakers_updated') {
        // Backend has resolved real names from enrollment — replace the entire
        // speaker list. Because LiveTranscript and ClaimBoard look up the
        // display name from the speakers prop at render time (not stored
        // as a string in the entry), every existing row automatically
        // re-renders with the correct name.
        setSpeakers(msg.speakers)
      }

      if (msg.type === 'transcript_partial') {
        setTranscript((prev) => {
          const partialIdx = prev.findIndex((e) => !e.is_final && e.speaker_id === msg.speaker_id)
          const entry: TranscriptEntry = {
            id:         `partial-${msg.speaker_id ?? 'unknown'}`,
            speaker_id: msg.speaker_id,
            text:       msg.text,
            is_final:   false,
            start_ms:   msg.start_ms,
          }
          if (partialIdx !== -1) {
            const next = [...prev]
            next[partialIdx] = entry
            return next
          }
          return [...prev, entry]
        })
      }

      if (msg.type === 'transcript_final') {
        setTranscript((prev) => {
          const without = prev.filter((e) => !(
            !e.is_final && e.speaker_id === msg.speaker_id
          ))
          return [...without, {
            id:         msg.utterance_id,
            speaker_id: msg.speaker_id,
            text:       msg.text,
            is_final:   true,
            start_ms:   msg.start_ms,
          }]
        })
      }

      if (msg.type === 'claims_updated') {
        setClaims(msg.claims)
      }

      if (msg.type === 'clarifying_question') {
        setActiveQuestion(msg.question)
      }

      if (msg.type === 'report_ready') {
        receiveReport(msg.report)
      }

      if (msg.type === 'session_ended') {
        setSessionEnded(true)
      }

      if (msg.type === 'error') {
        console.error('[Session WS error]', msg.detail)
      }
    })

    return () => {
      unsubStatus()
      unsubMsg()
      micRef.current?.stop()
      micRef.current = null
      pollAbortRef.current?.abort()
      sock.disconnect()
    }
    // speakerNames is derived from URL — stable for the lifetime of the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  async function _startMic(sock: MediatorSocket) {
    if (micRef.current) return // already started
    const mic = new MicCapture({
      socket: sock,
      onError: (err) => setMicError(err),
    })
    const ok = await mic.start()
    if (ok) {
      micRef.current = mic
      mic.setMuted(pausedRef.current)
    }
  }

  // ── End session ────────────────────────────────────────────────────────────
  function handleEndSession() {
    setSessionEnded(true)
    micRef.current?.stop()
    micRef.current = null
    sockRef.current?.send({ type: 'end_session' })

    // The backend builds the report async after end_session — the WS may
    // already be closing by the time it's ready. Start a poll loop so we
    // get the report even when the WS delivery misses.
    let token = ''
    try { token = getAuthToken() ?? '' } catch { /* ignore */ }
    const ac = new AbortController()
    pollAbortRef.current = ac
    pollForReport(sessionId, token, receiveReport, ac.signal)
  }

  // ── Report view ────────────────────────────────────────────────────────────
  if (showReport && report) {
    return (
      <div className="min-h-screen bg-[#FDFDFD]">
        <nav className="sticky top-0 z-10 border-b border-[#002d16] bg-[#003017] px-4 py-2.5 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-white/10 flex items-center justify-center">
              <img src="/logo.png" alt="MediFact logo" className="w-3.5 h-3.5 object-contain" />
            </div>
            <span className="text-white font-semibold text-sm">MediFact</span>
          </div>
        </nav>
        <MediationReportView report={report} speakerMap={speakerMap} sessionId={sessionId} />
      </div>
    )
  }

  // ── Session view ───────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FDFDFD] text-[#22303C]">

      {/* Top bar */}
      <nav className="flex-shrink-0 border-b border-[#002d16] bg-[#003017] px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-white/10 flex items-center justify-center">
            <img src="/logo.png" alt="MediFact logo" className="w-3.5 h-3.5 object-contain" />
          </div>
          <span className="text-white font-semibold text-sm">MediFact</span>
        </div>

        <div className="flex items-center gap-3">
          {/* WS status dot */}
          <span
            title={wsStatus}
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              wsStatus === 'connected'    ? 'bg-green-400' :
              wsStatus === 'failed'       ? 'bg-red-400'   :
              'bg-yellow-400 animate-pulse'
            }`}
          />

          {/* Pause / Resume */}
          {!sessionEnded && (
            <button
              onClick={() => setPaused((p) => !p)}
              className={`px-3 py-1 rounded-sm text-xs font-medium border transition-colors ${
                paused
                  ? 'bg-yellow-900/40 border-yellow-400/40 text-yellow-300'
                  : 'bg-white/10 border-white/20 text-white'
              }`}
            >
              {paused ? (
                <span className="flex items-center gap-1.5"><Play size={13} strokeWidth={2} />Resume</span>
              ) : (
                <span className="flex items-center gap-1.5"><Pause size={13} strokeWidth={2} />Pause</span>
              )}
            </button>
          )}

          {/* End session */}
          {!sessionEnded && (
            <button
              onClick={handleEndSession}
              className="px-4 py-1.5 bg-white hover:bg-gray-100 active:bg-gray-200 text-[#003017] text-xs font-semibold rounded-sm transition-colors"
            >
              End session &amp; generate report
            </button>
          )}

          {sessionEnded && !showReport && (
            <span className="text-xs text-[#F4A259] animate-pulse font-medium">
              Generating report…
            </span>
          )}
        </div>
      </nav>

      {/* Generating report overlay — same as demo page */}
      {sessionEnded && !showReport && (
        <div className="fixed inset-0 z-50 bg-[#003017]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <div className="w-14 h-14 rounded-md bg-white/10 flex items-center justify-center">
            <img src="/logo.png" alt="MediFact logo" className="w-7 h-7 object-contain" />
          </div>
          <p className="text-white font-bebas text-[2rem] tracking-wide uppercase">Generating report…</p>
          <div className="w-72 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.15) 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s linear infinite',
              }}
            />
          </div>
          <p className="text-white/40 text-xs">Analysing evidence · cross-referencing claims</p>
          <style>{`
            @keyframes shimmer {
              0%   { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      )}

      {/* Mic error banner */}
      {micError && (
        <div className="flex-shrink-0 px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
          {micError}
        </div>
      )}

      {/* Clarifying question banner */}
      {activeQuestion && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-[#E2E8ED] bg-white">
          <ContradictionAlert
            question={activeQuestion}
            onDismiss={() => setActiveQuestion(null)}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Transcript — 55% */}
        <div className="w-[55%] border-r border-[#E2E8ED] p-4 flex flex-col bg-white">
          <LiveTranscript entries={transcript} speakers={speakers} />
        </div>

        {/* Right panel — 45% */}
        <div className="w-[45%] flex flex-col overflow-hidden">
          {/* Evidence upload */}
          <div className="flex-shrink-0 px-3 py-3 border-b border-[#E2E8ED] bg-white">
            <EvidenceUpload sessionId={sessionId} />
          </div>

          {/* Claim board — speakers is reactive state, re-renders on speakers_updated */}
          <div className="flex-1 px-3 py-3 overflow-hidden bg-[#FDFDFD]">
            <ClaimBoard claims={claims} speakers={speakers} />
          </div>
        </div>

      </div>
    </div>
  )
}
