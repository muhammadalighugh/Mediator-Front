'use client'

import type { MediationReport as Report, Claim, EvidenceLink, ContradictionFlag, VerdictType } from '@/lib/types'

interface MediationReportProps {
  report: Report
  speakerMap: Map<string, { display_name: string; color: string }>
}

const VERDICT_STYLES: Record<VerdictType, { label: string; bg: string; text: string; border: string }> = {
  supported:              { label: 'SUPPORTED',             bg: 'bg-green-950',  text: 'text-green-400',  border: 'border-green-800' },
  contradicted:           { label: 'CONTRADICTED',          bg: 'bg-red-950',    text: 'text-red-400',    border: 'border-red-800'   },
  uncertain:              { label: 'UNCERTAIN',             bg: 'bg-amber-950',  text: 'text-amber-400',  border: 'border-amber-800' },
  insufficient_evidence:  { label: 'INSUFFICIENT EVIDENCE', bg: 'bg-[#1a1d27]',  text: 'text-[#7b8096]',  border: 'border-[#2a2d3a]' },
}

const DISPUTE_TYPE_STYLES: Record<string, string> = {
  FACTUAL:          'bg-blue-950 text-blue-400 border-blue-800',
  PRIORITIES:       'bg-purple-950 text-purple-400 border-purple-800',
  MISUNDERSTANDING: 'bg-amber-950 text-amber-400 border-amber-800',
  MIXED:            'bg-[#1a1d27] text-[#7b8096] border-[#2a2d3a]',
}

function VerdictBadge({ verdict }: { verdict: VerdictType }) {
  const s = VERDICT_STYLES[verdict]
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  )
}

export default function MediationReportView({ report, speakerMap }: MediationReportProps) {
  const claimMap = new Map<string, Claim>(report.claims.map((c) => [c.id, c]))
  const verdictMap = new Map<string, EvidenceLink>(report.verdicts.map((v) => [v.claim_id, v]))
  const disputeClass = DISPUTE_TYPE_STYLES[report.dispute_type] ?? DISPUTE_TYPE_STYLES.MIXED

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Mediation Report</h1>
          <p className="text-xs text-[#7b8096]">Session {report.session_id}</p>
        </div>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${disputeClass}`}>
          {report.dispute_type} DISPUTE
        </span>
      </div>

      {/* Executive summary */}
      <section className="mb-8 p-5 bg-[#1a1d27] rounded-2xl border border-[#2a2d3a]">
        <h2 className="text-sm font-semibold text-[#7b8096] uppercase tracking-wider mb-3">
          Executive Summary
        </h2>
        <p className="text-sm text-[#c0c4d6] leading-relaxed">{report.summary}</p>
      </section>

      {/* Verdicts table */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[#7b8096] uppercase tracking-wider mb-3">
          Claim Verdicts
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-[#2a2d3a]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2d3a] text-xs text-[#7b8096] uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Claim</th>
                <th className="text-left px-4 py-3 font-medium">Speaker</th>
                <th className="text-left px-4 py-3 font-medium">Verdict</th>
                <th className="text-left px-4 py-3 font-medium">Evidence quote</th>
                <th className="text-left px-4 py-3 font-medium">Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {report.claims.map((claim, i) => {
                const link = verdictMap.get(claim.id)
                const spk = claim.speaker_id ? speakerMap.get(claim.speaker_id) : null
                const chipColor = spk?.color ?? '#7b8096'
                const verdict = link?.verdict ?? 'insufficient_evidence'
                const rowBg = i % 2 === 0 ? 'bg-[#0f1117]' : 'bg-[#1a1d27]'
                return (
                  <tr key={claim.id} className={`${rowBg} border-b border-[#2a2d3a] last:border-0`}>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-[#e8eaf0] text-xs leading-snug">{claim.verbatim_quote}</p>
                      <p className="text-[10px] text-[#4a4d5a] mt-0.5 capitalize">
                        {claim.statement_type.replace('_', ' ')}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {spk ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: chipColor + '22',
                            color: chipColor,
                            border: `1px solid ${chipColor}44`,
                          }}
                        >
                          {spk.display_name}
                        </span>
                      ) : (
                        <span className="text-[#4a4d5a] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <VerdictBadge verdict={verdict} />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {link?.quote ? (
                        <div>
                          <blockquote className="text-xs text-[#c0c4d6] italic border-l-2 border-indigo-700 pl-2 leading-snug">
                            "{link.quote}"
                          </blockquote>
                        </div>
                      ) : (
                        <span className="text-xs text-[#4a4d5a]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-[#7b8096] leading-snug">{link?.reasoning ?? '—'}</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Contradictions */}
      {report.contradictions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#7b8096] uppercase tracking-wider mb-3">
            Contradictions ({report.contradictions.length})
          </h2>
          <div className="space-y-3">
            {report.contradictions.map((flag, i) => {
              const ca = claimMap.get(flag.claim_id_a)
              const cb = claimMap.get(flag.claim_id_b)
              const spkA = ca?.speaker_id ? speakerMap.get(ca.speaker_id) : null
              const spkB = cb?.speaker_id ? speakerMap.get(cb.speaker_id) : null
              return (
                <div
                  key={i}
                  className="p-4 bg-red-950 border border-red-900 rounded-xl"
                >
                  <p className="text-xs font-semibold text-red-400 mb-3 uppercase tracking-wide">
                    ⚡ {flag.description}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[{ claim: ca, spk: spkA }, { claim: cb, spk: spkB }].map(({ claim, spk }, j) => (
                      <div key={j} className="bg-[#1a1d27] rounded-lg p-3">
                        {spk && (
                          <p
                            className="text-[10px] font-semibold mb-1"
                            style={{ color: spk.color }}
                          >
                            {spk.display_name}
                          </p>
                        )}
                        <p className="text-xs text-[#c0c4d6] italic">
                          "{claim?.verbatim_quote ?? '—'}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Common ground */}
      {report.agreements.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#7b8096] uppercase tracking-wider mb-3">
            Common Ground
          </h2>
          <div className="p-4 bg-green-950 border border-green-900 rounded-xl space-y-2">
            {report.agreements.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-green-200">
                <span className="text-green-500 flex-shrink-0">✓</span>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Disclaimer footer */}
      <footer className="mt-10 pt-4 border-t border-[#2a2d3a] text-center">
        <p className="text-xs text-[#4a4d5a] italic">
          This report does not declare a winner — verdicts reflect available evidence only.
        </p>
      </footer>
    </div>
  )
}
