'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import LiveTranscript from '@/components/LiveTranscript'
import ClaimBoard from '@/components/ClaimBoard'
import EvidenceUpload from '@/components/EvidenceUpload'
import ContradictionAlert from '@/components/ContradictionAlert'
import MediationReportView from '@/components/MediationReport'
import type { Claim, MediationReport, Speaker } from '@/lib/types'
import { useRequireAuth } from '@/lib/useRequireAuth'

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
// Dummy data
// ---------------------------------------------------------------------------

const DUMMY_SPEAKERS: Speaker[] = [
  { id: 'speaker_0', display_name: 'Alex', color: '#6366f1' },
  { id: 'speaker_1', display_name: 'Sam',  color: '#f59e0b' },
]

const DUMMY_TRANSCRIPT = [
  { id: 't1',          speaker_id: 'speaker_0', text: 'I clearly submitted the expense report before the deadline on Friday.', is_final: true, start_ms: 0 },
  { id: 't2',          speaker_id: 'speaker_1', text: 'That is not true — the system shows it came in Monday morning.', is_final: true, start_ms: 4200 },
  { id: 't3',          speaker_id: 'speaker_0', text: 'I have the email confirmation with a Friday 4pm timestamp.', is_final: true, start_ms: 9100 },
  { id: 't4',          speaker_id: 'speaker_1', text: 'Emails can be delayed. The audit log is the authoritative source here.', is_final: true, start_ms: 14500 },
  { id: 't5',          speaker_id: 'speaker_0', text: 'The audit log does not account for timezone differences between offices.', is_final: true, start_ms: 20000 },
  { id: 't6',          speaker_id: 'speaker_1', text: 'All timestamps in the system are stored in UTC, that is a documented fact.', is_final: true, start_ms: 26300 },
  { id: 't7',          speaker_id: 'speaker_0', text: 'Then why does my confirmation email show a different time?', is_final: true, start_ms: 32000 },
  { id: 't8',          speaker_id: 'speaker_1', text: 'Because your email client displays local time, not UTC.', is_final: true, start_ms: 37500 },
  { id: 't9',          speaker_id: 'speaker_0', text: 'I will check with IT — they must have the original server logs.', is_final: true, start_ms: 43000 },
  { id: 't10',         speaker_id: 'speaker_1', text: 'That would be helpful. The server logs are the only thing that can settle this.', is_final: true, start_ms: 48500 },
  { id: 't11',         speaker_id: 'speaker_0', text: 'Agreed. And I also want to know why the portal did not send me a late submission warning.', is_final: true, start_ms: 54000 },
  { id: 't12',         speaker_id: 'speaker_1', text: 'The portal only sends warnings if the submission is more than 24 hours late. Yours came in less than that.', is_final: true, start_ms: 60200 },
  { id: 'partial-live', speaker_id: 'speaker_0', text: 'So there is still a window where it could have been on time…', is_final: false, start_ms: 66000 },
]

const DUMMY_CLAIMS: Claim[] = [
  { id: 'c1', speaker_id: 'speaker_0', text: 'Expense report submitted before Friday deadline', statement_type: 'claim', verbatim_quote: 'I clearly submitted the expense report before the deadline on Friday.', start_ms: 0, confidence: 0.82 },
  { id: 'c2', speaker_id: 'speaker_1', text: 'System shows submission arrived Monday morning', statement_type: 'fact', verbatim_quote: 'The system shows it came in Monday morning.', start_ms: 4200, confidence: 0.91 },
  { id: 'c3', speaker_id: 'speaker_0', text: 'Email confirmation has Friday 4pm timestamp', statement_type: 'evidence_ref', verbatim_quote: 'I have the email confirmation with a Friday 4pm timestamp.', start_ms: 9100, confidence: 0.88 },
  { id: 'c4', speaker_id: 'speaker_1', text: 'All system timestamps are stored in UTC', statement_type: 'fact', verbatim_quote: 'All timestamps in the system are stored in UTC, that is a documented fact.', start_ms: 26300, confidence: 0.95 },
  { id: 'c5', speaker_id: 'speaker_0', text: 'Audit log does not account for timezone differences', statement_type: 'assumption', verbatim_quote: 'The audit log does not account for timezone differences between offices.', start_ms: 20000, confidence: 0.61 },
  { id: 'c6', speaker_id: 'speaker_1', text: 'Email client displays local time, not UTC', statement_type: 'fact', verbatim_quote: 'Because your email client displays local time, not UTC.', start_ms: 37500, confidence: 0.93 },
]

const DUMMY_REPORT: MediationReport = {
  session_id: 'dummy-session',
  claims: DUMMY_CLAIMS,
  verdicts: [
    { claim_id: 'c1', evidence_chunk_id: 'e1', quote: 'Submission timestamp: 2024-03-11 08:42 UTC', verdict: 'contradicted', reasoning: 'Audit log records submission on Monday 08:42 UTC, which is after the Friday 17:00 UTC deadline.' },
    { claim_id: 'c2', evidence_chunk_id: 'e1', quote: 'Submission timestamp: 2024-03-11 08:42 UTC', verdict: 'supported', reasoning: 'Audit log directly confirms Monday morning timestamp.' },
    { claim_id: 'c3', evidence_chunk_id: 'e2', quote: 'Sent: Friday, March 8, 2024 4:02 PM (GMT+5)', verdict: 'supported', reasoning: 'Email confirmation shows Friday 4pm in GMT+5, which is Friday 11:02 UTC — before the deadline.' },
    { claim_id: 'c4', evidence_chunk_id: 'e3', quote: 'All timestamps recorded in Coordinated Universal Time (UTC)', verdict: 'supported', reasoning: 'System documentation explicitly states UTC storage for all events.' },
    { claim_id: 'c5', evidence_chunk_id: 'e3', quote: 'Timezone conversion is applied automatically at display layer', verdict: 'contradicted', reasoning: 'Documentation states timezone handling is automatic; the core log is reliable.' },
    { claim_id: 'c6', evidence_chunk_id: 'e3', quote: 'Client interface renders times in the user\'s local timezone', verdict: 'supported', reasoning: 'Confirmed by system documentation.' },
  ],
  contradictions: [
    { claim_id_a: 'c1', claim_id_b: 'c2', description: 'Alex claims Friday submission; audit log records Monday.', resolved: false },
  ],
  agreements: [
    'Both parties agree the email confirmation timestamp differs from the audit log.',
    'Both parties agree the deadline was end-of-day Friday.',
  ],
  dispute_type: 'Factual — timestamp discrepancy due to timezone offset',
  summary: 'The core dispute centres on a timezone offset. Alex\'s email client displayed Friday 4pm in GMT+5 (11:02 UTC), but the system audit log recorded the submission at 08:42 UTC Monday — after the Friday 17:00 UTC deadline. The most likely explanation is a delayed email relay, not a system error.',
  assessments: [
    { speaker_id: 'speaker_0', supported: 1, contradicted: 2, uncertain: 0, checkable_total: 3 },
    { speaker_id: 'speaker_1', supported: 3, contradicted: 0, uncertain: 0, checkable_total: 3 },
  ],
}

// ---------------------------------------------------------------------------
// Session page (dummy / preview mode — no real API or WebSocket calls)
// ---------------------------------------------------------------------------

export default function SessionPage() {
  useRequireAuth()

  const speakerMap = new Map(
    [...DUMMY_SPEAKERS, { id: 'speaker_unknown', display_name: 'Unknown', color: '#7b8096' }]
      .map((s) => [s.id, s])
  )

  const [showReport, setShowReport]     = useState(false)
  const [muted, setMuted]               = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState<string | null>(
    'Alex — can you share the original email confirmation so we can verify the send timestamp?'
  )
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])

  useEffect(() => {
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const entry = DUMMY_TRANSCRIPT[i]
      if (!entry) return
      i++
      setTranscript((prev) => [...prev, entry])
      if (i < DUMMY_TRANSCRIPT.length) {
        timer = setTimeout(tick, 2000)
      }
    }
    timer = setTimeout(tick, 1500)
    return () => clearTimeout(timer)
  }, [])

  function handleEndSession() {
    setSessionEnded(true)
    // Short delay to simulate report generation
    setTimeout(() => setShowReport(true), 1200)
  }

  // ── Report view ────────────────────────────────────────────────────────────
  if (showReport) {
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
        <MediationReportView report={DUMMY_REPORT} speakerMap={speakerMap} sessionId="dummy-session" />
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
          {/* Mute toggle */}
          {!sessionEnded && (
            <button
              onClick={() => setMuted((m) => !m)}
              className={`px-3 py-1 rounded-sm text-xs font-medium border transition-colors ${
                muted
                  ? 'bg-red-900/40 border-red-400/40 text-red-300'
                  : 'bg-white/10 border-white/20 text-white'
              }`}
            >
              {muted ? (
                <span className="flex items-center gap-1.5"><MicOff size={13} strokeWidth={2} />Muted</span>
              ) : (
                <span className="flex items-center gap-1.5"><Mic size={13} strokeWidth={2} />Live</span>
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

          {sessionEnded && (
            <span className="text-xs text-[#F4A259] animate-pulse font-medium">
              Generating report…
            </span>
          )}
        </div>
      </nav>

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
          <LiveTranscript entries={transcript} speakers={DUMMY_SPEAKERS} />
        </div>

        {/* Right panel — 45% */}
        <div className="w-[45%] flex flex-col overflow-hidden">
          {/* Evidence upload */}
          <div className="flex-shrink-0 px-3 py-3 border-b border-[#E2E8ED] bg-white">
            <EvidenceUpload sessionId="dummy-session" />
          </div>

          {/* Claim board */}
          <div className="flex-1 px-3 py-3 overflow-hidden bg-[#FDFDFD]">
            <ClaimBoard claims={DUMMY_CLAIMS} speakers={DUMMY_SPEAKERS} />
          </div>
        </div>

      </div>
    </div>
  )
}
