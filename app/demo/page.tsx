'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'

// ─── Hardcoded demo data ───────────────────────────────────────────────────────

// speakerIdx: 0 = Maya (dark green bubble, white badge)
//             1 = Daniel (white bubble, dark green badge)
// Matches LiveTranscript.tsx BOX_PALETTES exactly
const BOX_PALETTES = [
  { bg: 'bg-[#003017]', border: 'border-[#002d16]', text: 'text-white',       badge: 'bg-white text-[#003017] border-[#003017]' },
  { bg: 'bg-white',     border: 'border-[#003017]',  text: 'text-[#003017]',  badge: 'bg-[#003017] text-white border-[#002d16]' },
]

const TRANSCRIPT_TURNS = [
  { speaker: 'Maya',   idx: 0, time: '0:00', text: 'We need to sort out last week. I covered your Saturday shift, and you never even thanked me.' },
  { speaker: 'Daniel', idx: 1, time: '0:06', text: "That's backwards — I covered yours. Check the log." },
  { speaker: 'Maya',   idx: 0, time: '0:12', text: 'Whatever, the point is the report. I finished it and sent it to you Wednesday.' },
  { speaker: 'Daniel', idx: 1, time: '0:18', text: "I sent that report, and you replied 'got it, looks good.' Check the chat." },
  { speaker: 'Maya',   idx: 0, time: '0:25', text: "I never got any file from you... okay fine, I did see it Thursday. But the deadline was moved to Monday anyway, so nothing was late." },
  { speaker: 'Daniel', idx: 1, time: '0:33', text: "The deadline stayed Friday — the manager sent a reminder saying it's unchanged." },
  { speaker: 'Maya',   idx: 0, time: '0:40', text: 'The manager told me personally it was fine to submit late.' },
  { speaker: 'Daniel', idx: 1, time: '0:46', text: "I don't have that message anywhere. You never take responsibility for anything." },
  { speaker: 'Maya',   idx: 0, time: '0:53', text: "That's not fair. Fine — but you still owe me for Saturday." },
]

const CLAIM_CARDS: Array<{
  col: 'facts' | 'evidence' | 'claims' | 'opinion'
  speaker: string
  color: string
  text: string
  confidence: number
  afterTurn: number
}> = [
  { col: 'claims',   speaker: 'Maya',   color: '#6366f1', text: "Maya covered Daniel's Saturday shift",             confidence: 85, afterTurn: 0 },
  { col: 'evidence', speaker: 'Daniel', color: '#f59e0b', text: 'The shift record is in the log',                   confidence: 90, afterTurn: 1 },
  { col: 'claims',   speaker: 'Daniel', color: '#f59e0b', text: "Daniel covered Maya's Saturday shift",             confidence: 85, afterTurn: 1 },
  { col: 'claims',   speaker: 'Maya',   color: '#6366f1', text: 'Maya finished and sent the report on Wednesday',   confidence: 80, afterTurn: 2 },
  { col: 'evidence', speaker: 'Daniel', color: '#f59e0b', text: 'The report exchange is in the chat',               confidence: 90, afterTurn: 3 },
  { col: 'claims',   speaker: 'Daniel', color: '#f59e0b', text: 'Daniel sent the report and Maya confirmed receipt',confidence: 90, afterTurn: 3 },
  { col: 'claims',   speaker: 'Maya',   color: '#6366f1', text: 'The deadline was moved to Monday',                 confidence: 75, afterTurn: 4 },
  { col: 'facts',    speaker: 'Daniel', color: '#f59e0b', text: 'The manager sent a reminder that the deadline is unchanged', confidence: 95, afterTurn: 5 },
  { col: 'claims',   speaker: 'Maya',   color: '#6366f1', text: 'The manager approved a late submission verbally',  confidence: 70, afterTurn: 6 },
  { col: 'opinion',  speaker: 'Daniel', color: '#f59e0b', text: 'Maya never takes responsibility',                  confidence: 80, afterTurn: 7 },
]

const VERDICT_ROWS = [
  {
    claim: "Maya covered Daniel's Saturday shift",
    speaker: 'Maya', speakerColor: '#6366f1',
    verdict: 'contradicted' as const,
    quote: "Daniel covered Maya's Saturday shift for 8 hours on November 6, 2024. [work_log.csv]",
    reasoning: "The log attributes the shift to Daniel, not Maya.",
  },
  {
    claim: "Daniel covered Maya's Saturday shift",
    speaker: 'Daniel', speakerColor: '#f59e0b',
    verdict: 'supported' as const,
    quote: "Daniel covered Maya's Saturday shift for 8 hours on November 6, 2024. [work_log.csv]",
    reasoning: "Directly confirmed by the log.",
  },
  {
    claim: 'Maya finished and sent the report Wednesday',
    speaker: 'Maya', speakerColor: '#6366f1',
    verdict: 'contradicted' as const,
    quote: "Daniel: report is done, sending it now [messages.txt]",
    reasoning: "The chat shows Daniel submitted the report; Maya's reply confirms receipt, not submission.",
  },
  {
    claim: 'Daniel sent the report and Maya confirmed receipt',
    speaker: 'Daniel', speakerColor: '#f59e0b',
    verdict: 'supported' as const,
    quote: "Maya: got it, looks good [messages.txt]",
    reasoning: "Confirmed by the message exchange.",
  },
  {
    claim: 'The deadline was moved to Monday',
    speaker: 'Maya', speakerColor: '#6366f1',
    verdict: 'contradicted' as const,
    quote: "The manager noted the report deadline remains unchanged on November 8, 2024. [work_log.csv]",
    reasoning: "The reminder explicitly states the deadline stayed Friday — and Maya's own chat reply confirmed Friday.",
  },
  {
    claim: 'Maya is owed compensation for Saturday',
    speaker: 'Maya', speakerColor: '#6366f1',
    verdict: 'contradicted' as const,
    quote: "Daniel covered Maya's Saturday shift for 8 hours on November 6, 2024. [work_log.csv]",
    reasoning: "Since Daniel covered the shift, no debt is owed to Maya.",
  },
  {
    claim: 'The manager approved a late submission verbally',
    speaker: 'Maya', speakerColor: '#6366f1',
    verdict: 'insufficient' as const,
    quote: null,
    reasoning: "No message, note, or record of any verbal approval exists in the evidence.",
  },
]

// ─── Timing (ms at 1×) ────────────────────────────────────────────────────────
const TURN_DELAYS = [0, 4000, 7000, 11000, 16000, 21000, 27000, 33000, 40000]
const GENERATING_DELAY   = TURN_DELAYS[8] + 2000   // 42 000
const REPORT_DELAY       = GENERATING_DELAY + 3200  // 45 200

// Report section reveal sequence (relative offsets from REPORT_DELAY)
const REPORT_REVEAL = [0, 600, 1200, 1800, 2400, 3000, 3400, 3800, 4200, 4600, 5000, 5400, 5800, 6200, 6500]
// Verdict rows revealed from index 3 onwards at 380ms apart
const VERDICT_BASE_OFFSET = 1800

const VERDICT_CFG = {
  supported:    { label: 'SUPPORTED',             bg: 'bg-[#edfaf3]', text: 'text-[#1a9e5a]', border: 'border-[#b6f0d0]' },
  contradicted: { label: 'CONTRADICTED',          bg: 'bg-[#FFF4E8]', text: 'text-[#c76b0a]', border: 'border-[#F4A259]/50' },
  insufficient: { label: 'INSUFFICIENT EVIDENCE', bg: 'bg-[#F7F9FB]', text: 'text-[#9EAAB8]', border: 'border-[#E2E8ED]' },
}

const COL_CFG = {
  facts:    { label: 'Facts',    dot: 'bg-[#10b981]', header: 'bg-[#003017]',   text: 'text-white' },
  evidence: { label: 'Evidence', dot: 'bg-white',     header: 'bg-white',       text: 'text-[#003017]' },
  claims:   { label: 'Claims',   dot: 'bg-[#003017]', header: 'bg-white',       text: 'text-[#003017]' },
  opinion:  { label: 'Opinion',  dot: 'bg-[#9EAAB8]', header: 'bg-[#F7F9FB]',  text: 'text-[#5A6A75]' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'playing' | 'generating' | 'report'

export default function DemoPage() {
  const [phase,           setPhase]           = useState<Phase>('idle')
  const [paused,          setPaused]          = useState(false)
  const [speed,           setSpeed]           = useState<1 | 2 | 4>(1)
  const [visibleTurns,    setVisibleTurns]    = useState(0)
  const [visibleCards,    setVisibleCards]    = useState(0)
  const [visibleSections, setVisibleSections] = useState(0)
  const [visibleVerdicts, setVisibleVerdicts] = useState(0)

  const timersRef      = useRef<ReturnType<typeof setTimeout>[]>([])
  const startRef       = useRef(0)
  const pauseAtRef     = useRef(0)
  const elapsedRef     = useRef(0)
  const speedRef       = useRef<1 | 2 | 4>(1)
  const transcriptEnd  = useRef<HTMLDivElement>(null)

  useEffect(() => { speedRef.current = speed }, [speed])

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleTurns])

  // ── Scheduler ──────────────────────────────────────────────────────────────
  function clearTimers() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const at = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms / speedRef.current)
    timersRef.current.push(id)
  }, [])

  function scheduleAll(offsetMs: number) {
    clearTimers()

    // Transcript turns
    TURN_DELAYS.forEach((delay, i) => {
      const t = delay - offsetMs
      if (t > 0) at(t, () => setVisibleTurns(i + 1))
      else setVisibleTurns((p) => Math.max(p, i + 1))
    })

    // Claim cards
    CLAIM_CARDS.forEach((card, i) => {
      const delay = TURN_DELAYS[card.afterTurn] + 1500
      const t = delay - offsetMs
      if (t > 0) at(t, () => setVisibleCards((p) => Math.max(p, i + 1)))
      else setVisibleCards((p) => Math.max(p, i + 1))
    })

    // Generating phase
    const gT = GENERATING_DELAY - offsetMs
    if (gT > 0) at(gT, () => setPhase('generating'))
    else setPhase((p) => p === 'playing' ? 'generating' : p)

    // Report phase
    const rT = REPORT_DELAY - offsetMs
    if (rT > 0) at(rT, () => setPhase('report'))
    else setPhase((p) => (p === 'generating' || p === 'playing') ? 'report' : p)

    // Report sections
    REPORT_REVEAL.forEach((d, i) => {
      const t = REPORT_DELAY + d - offsetMs
      if (t > 0) at(t, () => setVisibleSections((p) => Math.max(p, i + 1)))
      else setVisibleSections((p) => Math.max(p, i + 1))
    })

    // Verdict rows
    VERDICT_ROWS.forEach((_, i) => {
      const t = REPORT_DELAY + VERDICT_BASE_OFFSET + 380 * i - offsetMs
      if (t > 0) at(t, () => setVisibleVerdicts((p) => Math.max(p, i + 1)))
      else setVisibleVerdicts((p) => Math.max(p, i + 1))
    })
  }

  function resetState() {
    clearTimers()
    setPhase('idle')
    setVisibleTurns(0)
    setVisibleCards(0)
    setVisibleSections(0)
    setVisibleVerdicts(0)
    setPaused(false)
  }

  function startDemo() {
    resetState()
    startRef.current   = Date.now()
    elapsedRef.current = 0
    setTimeout(() => {
      setPhase('playing')
      scheduleAll(0)
    }, 40)
  }

  function handleRestart() {
    startDemo()
  }

  function handlePlayPause() {
    if (paused) {
      const pausedDuration = Date.now() - pauseAtRef.current
      startRef.current += pausedDuration
      setPaused(false)
      scheduleAll(elapsedRef.current)
    } else {
      elapsedRef.current = (Date.now() - startRef.current) * speedRef.current
      pauseAtRef.current = Date.now()
      clearTimers()
      setPaused(true)
    }
  }

  function handleSpeed(s: 1 | 2 | 4) {
    const wasRunning = !paused && phase !== 'idle'
    if (wasRunning) {
      clearTimers()
      elapsedRef.current = (Date.now() - startRef.current) * speedRef.current
    }
    setSpeed(s)
    speedRef.current = s
    if (wasRunning) {
      startRef.current = Date.now() - elapsedRef.current / s
      scheduleAll(elapsedRef.current)
    }
  }

  useEffect(() => () => clearTimers(), [])

  const cols = ['facts', 'evidence', 'claims', 'opinion'] as const
  const cardsFor = (col: string) => CLAIM_CARDS.slice(0, visibleCards).filter((c) => c.col === col)
  const sec = (n: number) => visibleSections >= n

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F9FB] text-[#22303C]" style={{ fontFamily: '-apple-system,"Segoe UI",system-ui,sans-serif' }}>

      {/* DEMO badge — top-left */}
      <div className="fixed top-0 left-0 z-[9999] bg-[#F59E0B] text-black text-[10px] font-bold px-3 py-1 rounded-br-md tracking-widest">
        DEMO
      </div>

      {/* ── Nav (matches session page) ─────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[#002d16] bg-[#003017] px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-white/10 flex items-center justify-center">
            <img src="/logo.png" alt="MediFact logo" className="w-3.5 h-3.5 object-contain" />
          </div>
          <span className="text-white font-semibold text-sm">MediFact</span>
          <span className="text-[10px] font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 px-2 py-px rounded-sm tracking-wider">
            DEMO SESSION
          </span>
        </div>

        {phase !== 'idle' && (
          <div className="flex items-center gap-3">
            {/* WS status dot — exact match of session page nav */}
            <span
              title={paused ? 'paused' : phase === 'playing' ? 'connected' : 'generating'}
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                phase === 'playing' && !paused && visibleTurns > 0
                  ? 'bg-green-400'
                  : phase === 'playing' && visibleTurns === 0
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-green-400'
              }`}
            />
            <button
              onClick={handlePlayPause}
              className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-medium border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              {paused
                ? <><Play size={12} strokeWidth={2} /> Resume</>
                : <><Pause size={12} strokeWidth={2} /> Pause</>
              }
            </button>
            <button
              onClick={handleRestart}
              className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-medium border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <RotateCcw size={11} strokeWidth={2} /> Restart
            </button>
            <div className="flex gap-1">
              {([1, 2, 4] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeed(s)}
                  className={`px-2.5 py-1 rounded-sm text-xs font-bold border transition-colors ${
                    speed === s
                      ? 'bg-white text-[#003017] border-white'
                      : 'bg-white/10 text-white/60 border-white/20 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ── Idle / play screen ─────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-50px)] gap-8 px-6 text-center">
          {/* Hero matches landing page style */}
          <div className="w-16 h-16 rounded-md bg-[#003017] flex items-center justify-center shadow-lg">
            <img src="/logo.png" alt="MediFact logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="font-bebas text-[4rem] leading-[1] text-[#003017] tracking-wide uppercase mb-2">
              Argument Mediator
            </h1>
            <p className="text-[#5A6A75] text-base leading-relaxed max-w-md">
              Watch the full product experience — live transcript, claim board, and evidence-grounded report — all with hardcoded data.
            </p>
          </div>
          <button
            onClick={startDemo}
            className="bg-[#003017] hover:bg-[#004d24] active:bg-[#002d16] text-white font-semibold px-10 py-3.5 rounded-sm text-sm transition-colors shadow-md"
          >
            ▶&nbsp;&nbsp;Play demo
          </button>
          <p className="text-[#C2CDD6] text-xs">~75 seconds at 1× · no login · no backend · no microphone</p>

          {/* Three-step how it works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full mt-4">
            {[
              { n: '01', title: 'Transcript streams in', desc: 'Each speaker turn appears with live animations' },
              { n: '02', title: 'Claims are extracted',  desc: 'Cards pop into the claim board as each turn lands' },
              { n: '03', title: 'Report generated',      desc: 'Full evidence-grounded verdict report reveals section by section' },
            ].map((s) => (
              <div key={s.n} className="bg-white border border-[#E2E8ED] p-4 text-left">
                <p className="text-[10px] font-bold text-[#003017] uppercase tracking-widest mb-1">{s.n}</p>
                <p className="text-sm font-semibold text-[#22303C] mb-1">{s.title}</p>
                <p className="text-xs text-[#5A6A75] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Session view (playing + generating) ────────────────────────────── */}
      {(phase === 'playing' || phase === 'generating') && (
        <div className="flex h-[calc(100vh-50px)] overflow-hidden">

          {/* Transcript — 55% — same wrapper as session page:
              w-[55%] border-r border-[#E2E8ED] p-4 flex flex-col bg-white
              inner content = LiveTranscript's own flex flex-col h-full */}
          <div className="w-[55%] border-r border-[#E2E8ED] p-4 flex flex-col bg-white">
            {/* ── LiveTranscript replica ── */}
            <div className="flex flex-col h-full">
              {/* Header — identical to LiveTranscript.tsx lines 60-65 */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-[#003017] uppercase tracking-wider">
                  Live Transcript
                </h2>
                <span className="text-xs text-[#C2CDD6]">{visibleTurns} turns</span>
              </div>

              {/* Scroll area — identical to LiveTranscript.tsx line 67 */}
              <div className="flex-1 overflow-y-auto space-y-2 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#003017]/30 [&::-webkit-scrollbar-thumb]:rounded-none hover:[&::-webkit-scrollbar-thumb]:bg-[#003017]/60">
                {/* Empty state — identical to LiveTranscript.tsx lines 68-73 */}
                {visibleTurns === 0 && (
                  <div className="flex flex-col items-center gap-3 mt-10 text-center">
                    <BouncingDots />
                    <p className="text-[#22303C] text-sm font-medium">Waiting for speech…</p>
                  </div>
                )}
                {TRANSCRIPT_TURNS.slice(0, visibleTurns).map((turn, i) => (
                  <TurnRow key={i} turn={turn} isNew={i === visibleTurns - 1} />
                ))}
                <div ref={transcriptEnd} />
              </div>
            </div>
          </div>

          {/* Claim board — 45% — matches session page */}
          <div className="w-[45%] flex flex-col overflow-hidden bg-[#FDFDFD]">
            <div className="flex-shrink-0 px-3 py-2 border-b border-[#E2E8ED] flex items-center gap-2">
              <span className="text-[10px] font-semibold text-[#003017] uppercase tracking-wider">Claim Board</span>
              <span className="text-[10px] text-[#C2CDD6]">{visibleCards} total</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
              {cols.map((col) => (
                <ClaimColumn key={col} col={col} cards={cardsFor(col)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Generating overlay ──────────────────────────────────────────────── */}
      {phase === 'generating' && (
        <div className="fixed inset-0 z-50 bg-[#003017]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <div className="w-14 h-14 rounded-md bg-white/10 flex items-center justify-center">
            <img src="/logo.png" alt="MediFact logo" className="w-7 h-7 object-contain" />
          </div>
          <p className="text-white font-bebas text-[2rem] tracking-wide uppercase">Generating report…</p>
          <div className="w-72 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-white/20 via-white to-white/20 animate-[shimmer_1.4s_linear_infinite] bg-[length:200%_100%]" />
          </div>
          <p className="text-white/40 text-xs">Analysing evidence · cross-referencing claims</p>
        </div>
      )}

      {/* ── Report screen — matches MediationReport.tsx exactly ─────────────── */}
      {phase === 'report' && (
        <div className="min-h-[calc(100vh-50px)] bg-[#FDFDFD]">
          <div className="max-w-5xl mx-auto px-6 py-8 text-[#22303C]">

            {/* Header */}
            {sec(1) && (
              <div className="flex items-start justify-between mb-8 flex-wrap gap-4 animate-[fadeUp_0.5s_ease-out]">
                <div>
                  <h1 className="text-lg font-bold text-[#003017] mb-0.5">⚖ Mediation Report</h1>
                  <p className="text-[10px] text-[#9EAAB8] font-mono">session · demo-001</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-block px-2.5 py-1 rounded-sm text-[10px] font-semibold border bg-[#003017] text-white border-[#002d16] uppercase tracking-wide">
                    FACTUAL DISPUTE
                  </span>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold border border-[#003017] text-[#003017] hover:bg-[#003017] hover:text-white transition-colors rounded-sm"
                  >
                    ↓ Download PDF
                  </button>
                </div>
              </div>
            )}

            {/* Assessment */}
            {sec(2) && (
              <ReportSection title="Assessment" style="animate-[fadeUp_0.5s_ease-out]">
                <div className="rounded-sm border border-[#E2E8ED] bg-white px-4 py-3 space-y-3">
                  {sec(2) && (
                    <AssessmentRow name="Maya" supported={0} contradicted={3} unverified={2} />
                  )}
                  {sec(3) && (
                    <AssessmentRow name="Daniel" supported={3} contradicted={0} unverified={1} />
                  )}
                  {sec(4) && (
                    <p className="text-[11px] font-semibold text-[#1a9e5a] bg-[#edfaf3] border border-[#b6f0d0] px-3 py-2 rounded-sm animate-[fadeUp_0.4s_ease-out]">
                      The evidence favors Daniel — 3 of 3 checkable claims supported.
                    </p>
                  )}
                </div>
              </ReportSection>
            )}

            {/* Executive Summary */}
            {sec(5) && (
              <ReportSection title="Executive Summary" style="animate-[fadeUp_0.5s_ease-out]">
                <div className="rounded-sm border border-[#E2E8ED] bg-white px-4 py-3">
                  <p className="text-sm text-[#22303C] leading-relaxed">
                    The evidence favors Daniel: all three of his checkable claims are supported by the work log
                    and message records, while Maya&rsquo;s central claims are contradicted on each point. Both parties
                    agree a Saturday shift was covered — the log shows Daniel covered it. The claim that the manager
                    verbally approved a late submission remains unverified: no message or note exists in the evidence.
                  </p>
                </div>
              </ReportSection>
            )}

            {/* Claim Verdicts */}
            {sec(6) && (
              <ReportSection title="Claim Verdicts" count={VERDICT_ROWS.length} style="animate-[fadeUp_0.5s_ease-out]">
                <div className="rounded-sm border border-[#E2E8ED] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E8ED] bg-[#003017] text-white">
                        <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide">Claim</th>
                        <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide">Speaker</th>
                        <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide">Verdict</th>
                        <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide">Evidence quote</th>
                        <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide">Reasoning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {VERDICT_ROWS.slice(0, visibleVerdicts).map((row, i) => (
                        <VerdictRow key={i} row={row} index={i} isNew={i === visibleVerdicts - 1} />
                      ))}
                      {visibleVerdicts === 0 && (
                        <tr className="bg-white">
                          <td colSpan={5} className="px-4 py-5 text-center text-xs text-[#C2CDD6] animate-pulse">
                            Generating verdicts…
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </ReportSection>
            )}

            {/* Contradictions */}
            {sec(13) && (
              <ReportSection title="Contradictions" count={3} style="animate-[fadeUp_0.5s_ease-out]">
                <div className="space-y-3">
                  {[
                    "Who covered the Saturday shift (Maya vs Daniel) — resolved by the log",
                    "Who sent the report (Maya vs Daniel) — resolved by the chat",
                    "Deadline moved vs unchanged — resolved by the manager's reminder",
                  ].map((desc, i) => (
                    <div key={i} className="rounded-sm border border-[#F4A259]/50 bg-[#FFF4E8]">
                      <div className="px-3 py-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F4A259] flex-shrink-0" />
                        <p className="text-[10px] font-semibold text-[#c76b0a] uppercase tracking-wide">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ReportSection>
            )}

            {/* Common Ground */}
            {sec(14) && (
              <ReportSection title="Common Ground" style="animate-[fadeUp_0.5s_ease-out]">
                <div className="rounded-sm border border-[#b6f0d0] bg-[#edfaf3] px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="text-[#1a9e5a] font-bold text-xs flex-shrink-0">✓</span>
                    <p className="text-xs text-[#22303C] leading-snug">
                      Both agree a Saturday shift was covered; both accept the chat and log as valid records.
                    </p>
                  </div>
                </div>
              </ReportSection>
            )}

            {/* Footer */}
            {sec(15) && (
              <footer className="mt-10 pt-4 border-t border-[#E2E8ED] text-center animate-[fadeUp_0.5s_ease-out]">
                <p className="text-[10px] text-[#C2CDD6] italic">
                  This report does not declare a winner — verdicts reflect available evidence only.
                </p>
              </footer>
            )}
          </div>
        </div>
      )}

      {/* ── Keyframes ──────────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes slideFromLeft {
          from { transform: translateX(-16px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes scaleInBounce {
          0%   { transform: scale(0.80); opacity: 0; }
          65%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes fadeUp {
          from { transform: translateY(10px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes badgePulse {
          0%,100% { transform: scale(1); }
          40%      { transform: scale(1.15); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.001ms !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>
    </div>
  )
}

// ─── BouncingDots — inline copy of components/ui/bouncing-dots.tsx ────────────
function BouncingDots() {
  return (
    <div className="flex items-end justify-center gap-2 h-10">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-3 h-3 bg-[#003017] rounded-full"
          animate={{ y: [0, -16, 0], scaleY: [0.8, 1.1, 0.8] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ─── TurnRow — exact bubble layout from LiveTranscript.tsx ───────────────────
function TurnRow({
  turn, isNew,
}: {
  turn: typeof TRANSCRIPT_TURNS[0]
  isNew: boolean
}) {
  const palette = BOX_PALETTES[turn.idx]
  return (
    // Outer pt-3 matches LiveTranscript: space for the -top-2 badge to overflow
    <div
      className="block pt-3"
      style={{ animation: isNew ? 'slideFromLeft 0.35s ease-out' : 'none' }}
    >
      {/* Bubble — max-w-[80%], rounded-sm, px-4 pt-2 pb-2, exact palette */}
      <div className={`relative inline-block max-w-[80%] rounded-sm px-4 pt-2 pb-2 border ${palette.bg} ${palette.border}`}>
        {/* Badge pinned -top-2 left-2 — speaker name + timestamp */}
        <span className={`absolute -top-2 left-2 inline-flex items-center gap-1 px-1 py-px rounded-sm text-[8px] font-semibold border ${palette.badge}`}>
          {turn.speaker}
          <span className="opacity-80 tabular-nums">{turn.time}</span>
        </span>
        <p className={`text-sm leading-relaxed ${palette.text}`}>
          {turn.text}
        </p>
      </div>
    </div>
  )
}

// ─── ClaimColumn ──────────────────────────────────────────────────────────────
function ClaimColumn({
  col, cards,
}: {
  col: 'facts' | 'evidence' | 'claims' | 'opinion'
  cards: typeof CLAIM_CARDS
}) {
  const cfg = COL_CFG[col]
  const isDark = col === 'facts'
  const borderColor = isDark ? 'border-[#002d16]' : 'border-[#003017]'

  return (
    <div className={`flex flex-col rounded-md border overflow-hidden ${isDark ? 'bg-[#003017]' : 'bg-white'} ${borderColor}`}>
      {/* Column header */}
      <div className={`px-2.5 py-1.5 border-b ${borderColor} ${cfg.header} flex items-center justify-between`}>
        <span className={`text-[10px] font-semibold flex items-center gap-1.5 uppercase tracking-wide ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
        <span className={`text-[10px] tabular-nums opacity-50 ${cfg.text}`}>{cards.length}</span>
      </div>
      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pt-3 pb-2 space-y-3 min-h-[80px]">
        {cards.length === 0 && (
          <p className={`text-[10px] italic text-center mt-3 opacity-40 ${cfg.text}`}>None yet</p>
        )}
        {cards.map((card, i) => (
          <ClaimCard key={i} card={card} dark={isDark} borderColor={borderColor} />
        ))}
      </div>
    </div>
  )
}

// ─── ClaimCard ────────────────────────────────────────────────────────────────
function ClaimCard({
  card, dark, borderColor,
}: {
  card: typeof CLAIM_CARDS[0]
  dark: boolean
  borderColor: string
}) {
  const pct  = card.confidence
  const fill = pct >= 85 ? 'bg-[#003017]' : pct >= 70 ? 'bg-[#F4A259]' : 'bg-red-400'
  const textColor = dark ? 'text-white' : 'text-[#003017]'
  const badgeBg   = dark ? 'bg-white text-[#003017] border-[#003017]' : 'bg-[#003017] text-white border-[#002d16]'

  return (
    <div
      className={`relative rounded-md px-2 pt-4 pb-2 border ${borderColor} bg-white/10`}
      style={{ animation: 'scaleInBounce 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}
    >
      <span className={`absolute -top-2 left-2 inline-flex items-center px-1.5 py-px rounded-sm text-[8px] font-semibold border ${badgeBg}`}>
        {card.speaker}
      </span>
      <p className={`text-[11px] leading-snug ${textColor}`}>{card.text}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-[#E2E8ED] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[9px] text-[#9EAAB8] tabular-nums w-6 text-right">{pct}%</span>
      </div>
    </div>
  )
}

// ─── ReportSection ────────────────────────────────────────────────────────────
function ReportSection({
  title, children, count, style,
}: {
  title: string
  children: React.ReactNode
  count?: number
  style?: string
}) {
  return (
    <section className={`mb-6 ${style ?? ''}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[10px] font-semibold text-[#003017] uppercase tracking-wider">{title}</h2>
        {count !== undefined && <span className="text-xs text-[#C2CDD6]">{count}</span>}
      </div>
      {children}
    </section>
  )
}

// ─── AssessmentRow ────────────────────────────────────────────────────────────
function AssessmentRow({
  name, supported, contradicted, unverified,
}: {
  name: string
  supported: number
  contradicted: number
  unverified: number
}) {
  const total = (supported + contradicted + unverified) || 1
  return (
    <div className="animate-[fadeUp_0.4s_ease-out]">
      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
        <span className="inline-flex items-center px-1.5 py-px rounded-sm text-[8px] font-semibold border bg-[#003017] text-white border-[#002d16]">
          {name}
        </span>
        <span className="text-[11px] font-semibold text-[#1a9e5a]">
          {supported}<span className="text-[10px] font-normal text-[#9EAAB8] ml-1">supported</span>
        </span>
        <span className="text-[#E2E8ED]">·</span>
        <span className="text-[11px] font-semibold text-[#c76b0a]">
          {contradicted}<span className="text-[10px] font-normal text-[#9EAAB8] ml-1">contradicted</span>
        </span>
        <span className="text-[#E2E8ED]">·</span>
        <span className="text-[11px] font-semibold text-[#9EAAB8]">
          {unverified}<span className="text-[10px] font-normal text-[#9EAAB8] ml-1">unverified</span>
        </span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-[#E2E8ED] max-w-xs">
        <div className="bg-[#1a9e5a]" style={{ width: `${(supported / total) * 100}%` }} />
        <div className="bg-[#F4A259]" style={{ width: `${(contradicted / total) * 100}%` }} />
      </div>
    </div>
  )
}

// ─── VerdictRow ───────────────────────────────────────────────────────────────
function VerdictRow({
  row, index, isNew,
}: {
  row: typeof VERDICT_ROWS[0]
  index: number
  isNew: boolean
}) {
  const v   = VERDICT_CFG[row.verdict]
  const bg  = index % 2 === 0 ? 'bg-white' : 'bg-[#F7F9FB]'
  return (
    <tr
      className={`${bg} border-b border-[#E2E8ED] last:border-0`}
      style={{ animation: isNew ? 'fadeUp 0.4s ease-out' : 'none' }}
    >
      <td className="px-3 py-2.5 max-w-[200px]">
        <p className="text-[#22303C] text-xs leading-snug">{row.claim}</p>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span
          className="inline-flex items-center px-1.5 py-px rounded-sm text-[8px] font-semibold border"
          style={{
            background: row.speakerColor + '18',
            color: row.speakerColor,
            borderColor: row.speakerColor + '44',
          }}
        >
          {row.speaker}
        </span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span
          className={`inline-block px-2 py-0.5 rounded-sm text-[9px] font-bold border tracking-wide ${v.bg} ${v.text} ${v.border}`}
          style={{ animation: isNew ? 'badgePulse 0.5s ease-out' : 'none' }}
        >
          {v.label}
        </span>
      </td>
      <td className="px-3 py-2.5 max-w-[200px]">
        {row.quote ? (
          <blockquote className="text-[11px] text-[#5A6A75] italic border-l-2 border-[#003017]/30 pl-2 leading-snug">
            &ldquo;{row.quote}&rdquo;
          </blockquote>
        ) : (
          <span className="text-[#C2CDD6]">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 max-w-[200px]">
        <p className="text-[11px] text-[#5A6A75] leading-snug">{row.reasoning}</p>
      </td>
    </tr>
  )
}
