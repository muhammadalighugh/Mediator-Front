'use client'

import type { Claim, Speaker, StatementType } from '@/lib/types'

interface ClaimBoardProps {
  claims: Claim[]
  speakers: Speaker[]
}

const COLUMNS: { type: StatementType; label: string; emoji: string; color: string }[] = [
  { type: 'fact',        label: 'Facts',       emoji: '📋', color: 'text-blue-400'   },
  { type: 'claim',       label: 'Claims',      emoji: '💬', color: 'text-amber-400'  },
  { type: 'assumption',  label: 'Assumptions', emoji: '🤔', color: 'text-purple-400' },
  { type: 'evidence_ref', label: 'Evidence',   emoji: '📎', color: 'text-green-400'  },
]

function ConfidenceDot({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <span className="flex items-center gap-1 text-[10px] text-[#7b8096]">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
      {pct}%
    </span>
  )
}

export default function ClaimBoard({ claims, speakers }: ClaimBoardProps) {
  const speakerMap = new Map(speakers.map((s) => [s.id, s]))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#7b8096] uppercase tracking-wider">
          Claims
        </h2>
        <span className="text-xs text-[#4a4d5a]">{claims.length} total</span>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1 overflow-hidden">
        {COLUMNS.map(({ type, label, emoji, color }) => {
          const col = claims.filter((c) => c.statement_type === type)
          return (
            <div
              key={type}
              className="flex flex-col bg-[#1a1d27] rounded-xl border border-[#2a2d3a] overflow-hidden"
            >
              {/* Column header */}
              <div className="px-3 py-2 border-b border-[#2a2d3a] flex items-center justify-between">
                <span className={`text-xs font-semibold ${color}`}>
                  {emoji} {label}
                </span>
                <span className="text-xs text-[#4a4d5a] tabular-nums">{col.length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {col.length === 0 && (
                  <p className="text-[10px] text-[#4a4d5a] italic text-center mt-4">
                    None yet
                  </p>
                )}
                {col.map((claim) => {
                  const spk = claim.speaker_id ? speakerMap.get(claim.speaker_id) : null
                  const chipColor = spk?.color ?? '#7b8096'
                  return (
                    <div
                      key={claim.id}
                      className="bg-[#0f1117] rounded-lg p-2 border border-[#2a2d3a] animate-slide-in"
                    >
                      {spk && (
                        <span
                          className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold mb-1"
                          style={{
                            backgroundColor: chipColor + '22',
                            color: chipColor,
                            border: `1px solid ${chipColor}44`,
                          }}
                        >
                          {spk.display_name}
                        </span>
                      )}
                      <p className="text-xs text-[#c0c4d6] leading-snug">{claim.text}</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <ConfidenceDot value={claim.confidence} />
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
