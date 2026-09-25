'use client'

import type { Claim, Speaker, StatementType } from '@/lib/types'

interface ClaimBoardProps {
  claims: Claim[]
  speakers: Speaker[]
}

const COLUMNS: { type: StatementType; label: string; bg: string; border: string; text: string; dot: string }[] = [
  { type: 'fact',         label: 'Facts',       bg: 'bg-[#003017]',  border: 'border-[#002d16]', text: 'text-white',        dot: 'bg-white' },
  { type: 'claim',        label: 'Claims',      bg: 'bg-white',      border: 'border-[#003017]',  text: 'text-[#003017]',   dot: 'bg-[#003017]' },
  { type: 'assumption',   label: 'Assumptions', bg: 'bg-[#003017]',  border: 'border-[#002d16]', text: 'text-white',        dot: 'bg-white' },
  { type: 'evidence_ref', label: 'Evidence',    bg: 'bg-white',      border: 'border-[#003017]',  text: 'text-[#003017]',   dot: 'bg-[#003017]' },
]

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const fill = pct >= 80 ? 'bg-[#003017]' : pct >= 50 ? 'bg-[#F4A259]' : 'bg-red-400'
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-[#E2E8ED] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-[#9EAAB8] tabular-nums w-6 text-right">{pct}%</span>
    </div>
  )
}

export default function ClaimBoard({ claims, speakers }: ClaimBoardProps) {
  const speakerMap = new Map(speakers.map((s) => [s.id, s]))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-[#003017] uppercase tracking-wider">Claims</h2>
        <span className="text-xs text-[#C2CDD6]">{claims.length} total</span>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1 overflow-hidden">
        {COLUMNS.map(({ type, label, bg, border, text, dot }) => {
          const col = claims.filter((c) => c.statement_type === type)
          return (
            <div key={type} className={`flex flex-col rounded-md border overflow-hidden ${bg} ${border}`}>

              {/* Column header */}
              <div className={`px-2.5 py-1.5 border-b ${border} flex items-center justify-between`}>
                <span className={`text-[10px] font-semibold flex items-center gap-1.5 uppercase tracking-wide ${text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  {label}
                </span>
                <span className={`text-[10px] tabular-nums opacity-50 ${text}`}>{col.length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-2 pt-3 pb-2 space-y-4 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#003017]/30 [&::-webkit-scrollbar-thumb]:rounded-none hover:[&::-webkit-scrollbar-thumb]:bg-[#003017]/60">
                {col.length === 0 && (
                  <p className={`text-[10px] italic text-center mt-4 opacity-40 ${text}`}>None yet</p>
                )}
                {col.map((claim) => {
                  const spk = claim.speaker_id ? speakerMap.get(claim.speaker_id) : null
                  // Badge: opposite of column — green col gets white badge, white col gets green badge
                  const badgeBg   = bg === 'bg-[#003017]' ? 'bg-white'     : 'bg-[#003017]'
                  const badgeText = bg === 'bg-[#003017]' ? 'text-[#003017]' : 'text-white'
                  const badgeBorder = bg === 'bg-[#003017]' ? 'border-[#003017]' : 'border-[#002d16]'
                  return (
                    <div key={claim.id} className={`relative rounded-md px-2 pt-4 pb-2 border ${border} bg-white/10`}>
                      {spk && (
                        <span className={`absolute -top-2 left-2 inline-flex items-center px-1.5 py-px rounded-sm text-[8px] font-semibold border ${badgeBg} ${badgeText} ${badgeBorder}`}>
                          {spk.display_name}
                        </span>
                      )}
                      <p className={`text-[11px] leading-snug ${text}`}>{claim.text}</p>
                      <div className="mt-1.5">
                        <ConfidenceBar value={claim.confidence} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
