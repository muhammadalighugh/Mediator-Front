'use client'

import { useState } from 'react'
import type { MediationReport as Report, Claim, EvidenceLink, ContradictionFlag, SpeakerAssessment, VerdictType } from '@/lib/types'

const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8000'

interface MediationReportProps {
  report: Report
  speakerMap: Map<string, { display_name: string; color: string }>
  /** When provided, shows the Download PDF button */
  sessionId?: string
}

const VERDICT_STYLES: Record<VerdictType, { label: string; bg: string; text: string; border: string }> = {
  supported:             { label: 'SUPPORTED',             bg: 'bg-[#edfaf3]', text: 'text-[#1a9e5a]',  border: 'border-[#b6f0d0]' },
  contradicted:          { label: 'CONTRADICTED',          bg: 'bg-[#FFF4E8]', text: 'text-[#c76b0a]',  border: 'border-[#F4A259]/50' },
  uncertain:             { label: 'UNCERTAIN',             bg: 'bg-[#FFF8F0]', text: 'text-[#F4A259]',  border: 'border-[#F4A259]/40' },
  insufficient_evidence: { label: 'NO EVIDENCE',           bg: 'bg-[#F7F9FB]', text: 'text-[#9EAAB8]',  border: 'border-[#E2E8ED]'   },
}

function VerdictBadge({ verdict }: { verdict: VerdictType }) {
  const s = VERDICT_STYLES[verdict]
  return (
    <span className={`inline-block px-2 py-0.5 rounded-sm text-[9px] font-bold border tracking-wide ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  )
}

// Speaker name tag — same style as transcript/claim board badges
function SpeakerTag({ name, dark = false }: { name: string; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-px rounded-sm text-[8px] font-semibold border ${
      dark
        ? 'bg-white text-[#003017] border-[#003017]'
        : 'bg-[#003017] text-white border-[#002d16]'
    }`}>
      {name}
    </span>
  )
}

// Section wrapper — same sharp border / bg as claim columns
function Section({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[10px] font-semibold text-[#003017] uppercase tracking-wider">{title}</h2>
        {count !== undefined && <span className="text-xs text-[#C2CDD6]">{count}</span>}
      </div>
      {children}
    </section>
  )
}

function getFavorabilityLine(
  assessments: SpeakerAssessment[],
  speakerMap: Map<string, { display_name: string; color: string }>,
  isConversation: boolean,
): string {
  if (isConversation) return 'No claims to evaluate.'
  if (assessments.length < 2) return 'The evidence does not clearly favor either party.'
  const [a, b] = assessments
  const scoreA = a.supported - a.contradicted
  const scoreB = b.supported - b.contradicted
  const nameA = speakerMap.get(a.speaker_id)?.display_name ?? a.speaker_id
  const nameB = speakerMap.get(b.speaker_id)?.display_name ?? b.speaker_id
  if (scoreA - scoreB >= 2)
    return `The evidence favors ${nameA} — ${a.supported} of ${a.checkable_total} checkable claim${a.checkable_total !== 1 ? 's' : ''} supported.`
  if (scoreB - scoreA >= 2)
    return `The evidence favors ${nameB} — ${b.supported} of ${b.checkable_total} checkable claim${b.checkable_total !== 1 ? 's' : ''} supported.`
  return 'The evidence does not clearly favor either party.'
}

export default function MediationReportView({ report, speakerMap, sessionId }: MediationReportProps) {
  const [pdfState, setPdfState] = useState<'idle' | 'generating'>('idle')

  async function handleDownloadPdf() {
    if (pdfState === 'generating') return
    setPdfState('generating')
    try {
      const res = await fetch(`${API_BASE}/report/${sessionId}/pdf`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mediation-report-${sessionId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download failed:', err)
    } finally {
      setPdfState('idle')
    }
  }

  const isConversation = (report.report_kind ?? 'dispute') === 'conversation'

  const claimMap = new Map<string, Claim>(report.claims.map((c) => [c.id, c]))
  const verdictMap = new Map<string, EvidenceLink>(report.verdicts.map((v) => [v.claim_id, v]))

  const verdictClaims = report.claims.filter(
    (c) =>
      !(c.statement_type === 'opinion') &&
      !(c.statement_type === 'evidence_ref' && !verdictMap.has(c.id)),
  )
  const skippedClaims = [
    ...report.claims.filter((c) => c.statement_type === 'evidence_ref' && !verdictMap.has(c.id)),
    ...report.claims.filter((c) => c.statement_type === 'opinion'),
  ]

  const favorabilityLine = getFavorabilityLine(report.assessments ?? [], speakerMap, isConversation)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 text-[#22303C]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#003017] mb-0.5">
            {isConversation ? 'Session Summary' : 'Mediation Report'}
          </h1>
          <p className="text-[10px] text-[#9EAAB8] font-mono">session · {report.session_id}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isConversation ? (
            <span className="inline-block px-2.5 py-1 rounded-sm text-[10px] font-semibold border bg-[#f0faf4] text-[#1a9e5a] border-[#b6f0d0] uppercase tracking-wide">
              Friendly conversation
            </span>
          ) : (
            <span className="inline-block px-2.5 py-1 rounded-sm text-[10px] font-semibold border bg-[#003017] text-white border-[#002d16] uppercase tracking-wide">
              {report.dispute_type}
            </span>
          )}
          {sessionId && (
            <button
              onClick={handleDownloadPdf}
              disabled={pdfState === 'generating'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold border border-[#003017] text-[#003017] hover:bg-[#003017] hover:text-white disabled:opacity-50 transition-colors rounded-sm"
            >
              {pdfState === 'generating' ? 'Generating…' : '↓ Download PDF'}
            </button>
          )}
        </div>
      </div>

      {/* ── Friendly conversation banner (conversation kind only) ── */}
      {isConversation && (
        <Section title="Summary">
          <div className="rounded-sm border border-[#b6f0d0] bg-[#f0faf4] px-4 py-5 flex items-start gap-3">
            <span className="text-[#1a9e5a] text-lg leading-none flex-shrink-0">✓</span>
            <p className="text-sm text-[#22303C] leading-relaxed">{report.summary}</p>
          </div>
        </Section>
      )}

      {/* ── Executive summary (dispute kind only) ── */}
      {!isConversation && (
        <Section title="Executive Summary">
          <div className="rounded-sm border border-[#E2E8ED] bg-white px-4 py-3">
            <p className="text-sm text-[#22303C] leading-relaxed">{report.summary}</p>
          </div>
        </Section>
      )}

      {/* ── Assessment (dispute kind only) ── */}
      {!isConversation && (report.assessments ?? []).length > 0 && (
        <Section title="Assessment">
          <div className="rounded-sm border border-[#E2E8ED] bg-white px-4 py-3 space-y-3">
            {(report.assessments ?? []).map((a) => {
              const spk = speakerMap.get(a.speaker_id)
              const total = a.checkable_total || 1
              const supportedPct = Math.round((a.supported / total) * 100)
              const contradictedPct = Math.round((a.contradicted / total) * 100)
              return (
                <div key={a.speaker_id}>
                  <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <SpeakerTag name={spk?.display_name ?? a.speaker_id} />
                    <span className="text-[11px] font-semibold text-[#1a9e5a]">
                      {a.supported}
                      <span className="text-[10px] font-normal text-[#9EAAB8] ml-1">supported</span>
                    </span>
                    <span className="text-[#E2E8ED]">·</span>
                    <span className="text-[11px] font-semibold text-[#c76b0a]">
                      {a.contradicted}
                      <span className="text-[10px] font-normal text-[#9EAAB8] ml-1">contradicted</span>
                    </span>
                    <span className="text-[#E2E8ED]">·</span>
                    <span className="text-[11px] font-semibold text-[#9EAAB8]">
                      {a.uncertain}
                      <span className="text-[10px] font-normal text-[#9EAAB8] ml-1">unverified</span>
                    </span>
                  </div>
                  {/* mini stacked bar */}
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-[#E2E8ED] max-w-xs">
                    <div className="bg-[#1a9e5a]" style={{ width: `${supportedPct}%` }} />
                    <div className="bg-[#F4A259]" style={{ width: `${contradictedPct}%` }} />
                  </div>
                </div>
              )
            })}
            <p className="text-[10px] text-[#9EAAB8] border-t border-[#E2E8ED] pt-2 italic">
              {favorabilityLine}
            </p>
          </div>
        </Section>
      )}

      {/* ── Claim Verdicts (dispute kind only) ── */}
      {!isConversation && <Section title="Claim Verdicts" count={verdictClaims.length}>
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
              {verdictClaims.map((claim, i) => {
                const link = verdictMap.get(claim.id)
                const spk = claim.speaker_id ? speakerMap.get(claim.speaker_id) : null
                const verdict = link?.verdict ?? 'insufficient_evidence'
                const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-[#F7F9FB]'
                return (
                  <tr key={claim.id} className={`${rowBg} border-b border-[#E2E8ED] last:border-0`}>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="text-[#22303C] text-xs leading-snug">{claim.verbatim_quote}</p>
                      <p className="text-[9px] text-[#C2CDD6] mt-0.5 capitalize">
                        {claim.statement_type.replace('_', ' ')}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {spk ? (
                        <SpeakerTag name={spk.display_name} />
                      ) : (
                        <span className="text-[#C2CDD6]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <VerdictBadge verdict={verdict} />
                    </td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      {link?.quote ? (
                        <blockquote className="text-[11px] text-[#5A6A75] italic border-l-2 border-[#003017]/30 pl-2 leading-snug">
                          &ldquo;{link.quote}&rdquo;
                        </blockquote>
                      ) : (
                        <span className="text-[#C2CDD6]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="text-[11px] text-[#5A6A75] leading-snug">{link?.reasoning ?? '—'}</p>
                    </td>
                  </tr>
                )
              })}
              {verdictClaims.length === 0 && (
                <tr className="bg-white">
                  <td colSpan={5} className="px-4 py-6 text-center text-xs text-[#C2CDD6]">
                    No checkable claims were extracted from this session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>}

      {/* ── Evidence references & opinions (dispute kind only) ── */}
      {!isConversation && skippedClaims.length > 0 && (
        <Section title="Evidence References & Opinions" count={skippedClaims.length}>
          <div className="rounded-sm border border-[#E2E8ED] overflow-hidden">
            {skippedClaims.map((claim, i) => {
              const spk = claim.speaker_id ? speakerMap.get(claim.speaker_id) : null
              const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-[#F7F9FB]'
              const isEvidenceRef = claim.statement_type === 'evidence_ref'
              return (
                <div
                  key={claim.id}
                  className={`${rowBg} px-3 py-2.5 flex items-start gap-3 border-b border-[#E2E8ED] last:border-0`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#22303C] leading-snug">{claim.verbatim_quote}</p>
                    <p className="text-[9px] text-[#C2CDD6] mt-0.5 capitalize">
                      {claim.statement_type.replace('_', ' ')}
                      {isEvidenceRef && ' — no matching passage found in uploaded evidence'}
                    </p>
                  </div>
                  {spk && <SpeakerTag name={spk.display_name} />}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Contradictions (dispute kind only) ── */}
      {!isConversation && report.contradictions.length > 0 && (
        <Section title="Contradictions" count={report.contradictions.length}>
          <div className="space-y-3">
            {report.contradictions.map((flag, i) => {
              const ca = claimMap.get(flag.claim_id_a)
              const cb = claimMap.get(flag.claim_id_b)
              const spkA = ca?.speaker_id ? speakerMap.get(ca.speaker_id) : null
              const spkB = cb?.speaker_id ? speakerMap.get(cb.speaker_id) : null
              return (
                <div
                  key={i}
                  className="rounded-sm border border-[#F4A259]/50 bg-[#FFF4E8]"
                >
                  {/* banner */}
                  <div className="px-3 py-2 border-b border-[#F4A259]/30 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F4A259] flex-shrink-0" />
                    <p className="text-[10px] font-semibold text-[#c76b0a] uppercase tracking-wide">
                      {flag.description}
                    </p>
                    {!flag.resolved && (
                      <span className="ml-auto text-[8px] font-bold border border-[#F4A259]/60 text-[#c76b0a] px-1.5 py-px rounded-sm">
                        UNRESOLVED
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-3">
                    {[{ claim: ca, spk: spkA }, { claim: cb, spk: spkB }].map(({ claim, spk }, j) => (
                      <div key={j} className="bg-white rounded-sm border border-[#E2E8ED] px-3 pt-4 pb-2.5 relative">
                        {spk && (
                          <span className="absolute -top-2 left-2">
                            <SpeakerTag name={spk.display_name} />
                          </span>
                        )}
                        <p className="text-xs text-[#5A6A75] italic leading-snug">
                          &ldquo;{claim?.verbatim_quote ?? '—'}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Common Ground (dispute kind only) ── */}
      {!isConversation && report.agreements.length > 0 && (
        <Section title="Common Ground" count={report.agreements.length}>
          <div className="rounded-sm border border-[#b6f0d0] bg-[#edfaf3] px-4 py-3 space-y-2">
            {report.agreements.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[#1a9e5a] font-bold text-xs flex-shrink-0">✓</span>
                <p className="text-xs text-[#22303C] leading-snug">{a}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Footer ── */}
      <footer className="mt-10 pt-4 border-t border-[#E2E8ED] text-center">
        <p className="text-[10px] text-[#C2CDD6] italic">
          {isConversation
            ? 'No dispute was detected in this session.'
            : 'This report does not declare a winner — verdicts reflect available evidence only.'}
        </p>
      </footer>
    </div>
  )
}
