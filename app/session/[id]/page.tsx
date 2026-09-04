'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { connect, MediatorSocket } from '@/lib/websocket'
import { MicCapture } from '@/lib/micCapture'
import { playDemo } from '@/lib/demoPlayer'
import LiveTranscript from '@/components/LiveTranscript'
import ClaimBoard from '@/components/ClaimBoard'
import EvidenceUpload from '@/components/EvidenceUpload'
import ContradictionAlert from '@/components/ContradictionAlert'
import MediationReportView from '@/components/MediationReport'
import type { Claim, ContradictionFlag, MediationReport, Speaker, ServerMessage } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types local to this page
// ---------------------------------------------------------------------------

interface TranscriptEntry {
  id: string
  speaker_id: string | null
  text: string
  is_final: boolean
  start_ms: number
}

// ---------------------------------------------------------------------------
// Session page
// ---------------------------------------------------------------------------

export default function SessionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = params.id as string
  const isDemo = searchParams.get('demo') === '1'

  // Parse speaker list from URL
  const speakersParam = searchParams.get('speakers')
  const speakerNames: string[] = speakersParam
    ? JSON.parse(decodeURIComponent(speakersParam))
    : ['Speaker A', 'Speaker B']

  const SPEAKER_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444']
  const speakers: Speaker[] = speakerNames.map((name, i) => ({
    id: `speaker_${i}`,
    display_name: name,
    color: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
  }))
  const speakerMap = new Map(speakers.map((s) => [s.id, s]))

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [contradictions, setContradictions] = useState<ContradictionFlag[]>([])
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)
  const [report, setReport] = useState<MediationReport | null>(null)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [muted, setMuted] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed'>('connecting')
  const [demoProgress, setDemoProgress] = useState<{ played: number; total: number } | null>(null)

  // Refs (avoid stale closure issues)
  const sockRef = useRef<MediatorSocket | null>(null)
  const micRef = useRef<MicCapture | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ------------------------------------------------------------------
  // WS message handler
  // ------------------------------------------------------------------
  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'transcript_partial':
        setTranscript((prev) => {
          // Replace existing in-flight partial (same stable id) or append new one
          const entry: TranscriptEntry = {
            id: 'partial-live',   // single stable id — only one partial at a time
            speaker_id: msg.speaker_id,
            text: msg.text,
            is_final: false,
            start_ms: msg.start_ms,
          }
          const idx = prev.findIndex((e) => e.id === 'partial-live')
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = entry
            return next
          }
          return [...prev, entry]
        })
        break

      case 'transcript_final':
        setTranscript((prev) => {
          // Remove the in-flight partial, append the committed final
          const withoutPartial = prev.filter((e) => e.id !== 'partial-live')
          return [
            ...withoutPartial,
            {
              id: msg.utterance_id,
              speaker_id: msg.speaker_id,
              text: msg.text,
              is_final: true,
              start_ms: msg.start_ms,
            },
          ]
        })
        break

      case 'claims_updated':
        setClaims(msg.claims)
        break

      case 'contradictions':
        setContradictions(msg.contradictions)
        break

      case 'clarifying_question':
        setActiveQuestion(msg.question)
        break

      case 'report_ready':
        setReport(msg.report)
        break

      case 'session_ended':
        setSessionEnded(true)
        break

      case 'error':
        console.error('[WS server error]', msg.detail)
        break
    }
  }, [])

  // ------------------------------------------------------------------
  // Connect WS + start mic / demo on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    const sock = connect(sessionId, { maxAttempts: 5 })
    sockRef.current = sock

    const unsubscribe = sock.on(handleMessage)

    // Poll for WS open
    const poll = setInterval(() => {
      if (sock.readyState === WebSocket.OPEN) {
        clearInterval(poll)
        setWsStatus('open')
        sock.send({ type: 'start_session', speakers: speakerNames })

        if (isDemo) {
          // Demo mode: stream audio automatically
          playDemo({
            socket: sock,
            onProgress: (played, total) => setDemoProgress({ played, total }),
            onDone: () => {
              setTimeout(() => {
                sock.send({ type: 'end_session' })
              }, 1000) // brief pause before ending
            },
          }).catch((err) => {
            console.error('[Demo] playDemo failed:', err)
            setMicError(`Demo failed: ${err.message}`)
          })
        } else {
          // Live mic mode
          const mic = new MicCapture({
            socket: sock,
            onError: setMicError,
          })
          micRef.current = mic
          mic.start().then((ok) => {
            if (!ok) setMicError((prev) => prev ?? 'Microphone failed to start')
          })
        }
      }
      if (sock.readyState === WebSocket.CLOSED) {
        clearInterval(poll)
        setWsStatus('closed')
      }
    }, 100)

    return () => {
      clearInterval(poll)
      unsubscribe()
      micRef.current?.stop()
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // ------------------------------------------------------------------
  // End session + report poll fallback
  // ------------------------------------------------------------------
  async function handleEndSession() {
    setSessionEnded(true)
    micRef.current?.stop()
    sockRef.current?.send({ type: 'end_session' })

    // Polling fallback: the WS report_ready message is the fast path, but
    // if the socket closes before the report finishes building (30-60s),
    // the frontend would hang. Poll GET /report/{id} every 3s until it
    // returns 200, then set the report state directly.
    const POLL_INTERVAL = 3000
    const MAX_POLLS = 40   // give up after 2 minutes
    let polls = 0

    const pollReport = async () => {
      if (polls++ >= MAX_POLLS) return
      try {
        const res = await fetch(`http://localhost:8000/report/${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          setReport(data)
          return   // done — stop polling
        }
      } catch {
        // backend not reachable yet — try again
      }
      pollTimerRef.current = setTimeout(pollReport, POLL_INTERVAL)
    }

    // Start polling after a short delay to let the WS fast-path succeed first
    pollTimerRef.current = setTimeout(pollReport, 5000)
  }

  // ------------------------------------------------------------------
  // Mute toggle
  // ------------------------------------------------------------------
  function toggleMute() {
    const next = !muted
    setMuted(next)
    micRef.current?.setMuted(next)
  }

  // ------------------------------------------------------------------
  // Report view
  // ------------------------------------------------------------------
  if (report) {
    return (
      <div className="min-h-screen">
        <nav className="sticky top-0 z-10 border-b border-[#2a2d3a] bg-[#0f1117]/90 backdrop-blur px-4 py-3 flex items-center gap-3">
          <span className="text-white font-semibold">⚖️ Argument Mediator</span>
          <span className="text-[#4a4d5a] text-sm">·</span>
          <span className="text-[#7b8096] text-sm">Report ready</span>
        </nav>
        <MediationReportView report={report} speakerMap={speakerMap} />
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Session view
  // ------------------------------------------------------------------
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <nav className="flex-shrink-0 border-b border-[#2a2d3a] px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">⚖️ Argument Mediator</span>
          <div className="flex gap-2">
            {speakers.map((s) => (
              <span
                key={s.id}
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: s.color + '22',
                  color: s.color,
                  border: `1px solid ${s.color}44`,
                }}
              >
                {s.display_name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* WS status */}
          <div className="flex items-center gap-1.5 text-xs text-[#7b8096]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                wsStatus === 'open' ? 'bg-green-500 animate-pulse' :
                wsStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
                'bg-red-500'
              }`}
            />
            {wsStatus === 'open' ? (isDemo ? 'Streaming demo' : 'Live') : wsStatus}
          </div>

          {/* Mute toggle (live only) */}
          {!isDemo && !sessionEnded && (
            <button
              onClick={toggleMute}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                muted
                  ? 'bg-red-950 border border-red-800 text-red-400'
                  : 'bg-green-950 border border-green-800 text-green-400'
              }`}
            >
              {muted ? '🔇 Muted' : '🎙 Live'}
            </button>
          )}

          {/* Demo progress */}
          {isDemo && demoProgress && (
            <div className="text-xs text-[#7b8096]">
              {Math.round((demoProgress.played / demoProgress.total) * 100)}% streamed
            </div>
          )}

          {/* End session */}
          {!sessionEnded && (
            <button
              onClick={handleEndSession}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              End session &amp; generate report
            </button>
          )}

          {sessionEnded && !report && (
            <span className="text-xs text-amber-400 animate-pulse">
              Generating report…
            </span>
          )}
        </div>
      </nav>

      {/* Mic/browser error banner */}
      {micError && (
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-red-950 border-b border-red-900">
          <span className="text-red-400 text-sm">⚠️</span>
          <p className="text-red-300 text-xs flex-1">{micError}</p>
          <button onClick={() => setMicError(null)} className="text-red-600 hover:text-red-400 text-lg">×</button>
        </div>
      )}

      {/* Clarifying question banner */}
      {activeQuestion && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-[#2a2d3a]">
          <ContradictionAlert
            question={activeQuestion}
            onDismiss={() => setActiveQuestion(null)}
          />
        </div>
      )}

      {/* Main content: transcript left (60%), right panel (40%) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript — 60% */}
        <div className="w-[60%] border-r border-[#2a2d3a] p-4 flex flex-col overflow-hidden">
          <LiveTranscript entries={transcript} speakers={speakers} />
        </div>

        {/* Right panel — 40% */}
        <div className="w-[40%] flex flex-col overflow-hidden">
          {/* Evidence upload */}
          <div className="flex-shrink-0 p-4 border-b border-[#2a2d3a]">
            <EvidenceUpload sessionId={sessionId} />
          </div>

          {/* Claim board */}
          <div className="flex-1 p-4 overflow-hidden">
            <ClaimBoard claims={claims} speakers={speakers} />
          </div>
        </div>
      </div>
    </div>
  )
}
