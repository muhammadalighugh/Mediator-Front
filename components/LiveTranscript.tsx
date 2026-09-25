'use client'

import { useEffect, useRef } from 'react'
import { BouncingDots } from '@/components/ui/bouncing-dots'
import type { Speaker } from '@/lib/types'

interface TranscriptEntry {
  id: string
  speaker_id: string | null
  text: string
  is_final: boolean
  start_ms: number
}

interface LiveTranscriptProps {
  entries: TranscriptEntry[]
  speakers: Speaker[]
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

// Per-speaker palettes
const BOX_PALETTES = [
  { bg: 'bg-[#003017]', border: 'border-[#002d16]', text: 'text-white',       badge: 'bg-white text-[#003017] border-[#003017]' },     // speaker 0 — green bubble, white badge
  { bg: 'bg-white',     border: 'border-[#003017]',  text: 'text-[#003017]', badge: 'bg-[#003017] text-white border-[#002d16]' },      // speaker 1 — white bubble, green badge
  { bg: 'bg-[#1d4ed8]', border: 'border-[#1e40af]',  text: 'text-white',     badge: 'bg-white text-[#1d4ed8] border-white' },
  { bg: 'bg-[#7c3aed]', border: 'border-[#6d28d9]',  text: 'text-white',     badge: 'bg-white text-[#7c3aed] border-white' },
  { bg: 'bg-[#be123c]', border: 'border-[#9f1239]',  text: 'text-white',     badge: 'bg-white text-[#be123c] border-white' },
]

export default function LiveTranscript({ entries, speakers }: LiveTranscriptProps) {
  const bottomRef   = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pinnedRef   = useRef(true)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => {
      pinnedRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (pinnedRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [entries])

  const speakerMap = new Map(speakers.map((s) => [s.id, s]))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-[#003017] uppercase tracking-wider">
          Live Transcript
        </h2>
        <span className="text-xs text-[#C2CDD6]">{entries.filter((e) => e?.is_final).length} turns</span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-2 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#003017]/30 [&::-webkit-scrollbar-thumb]:rounded-none hover:[&::-webkit-scrollbar-thumb]:bg-[#003017]/60">
        {entries.length === 0 && (
          <div className="flex flex-col items-center gap-3 mt-10 text-center">
            <BouncingDots />
            <p className="text-[#22303C] text-sm font-medium">Waiting for speech…</p>
          </div>
        )}

        {entries.filter(Boolean).map((entry) => {
          const speaker    = entry.speaker_id ? speakerMap.get(entry.speaker_id) : null
          const name       = speaker?.display_name ?? (entry.speaker_id ?? '?')
          const speakerIdx = speakers.findIndex((s) => s.id === entry.speaker_id)
          const palette    = BOX_PALETTES[(speakerIdx >= 0 ? speakerIdx : speakers.length) % BOX_PALETTES.length]

          return (
            <div
              key={entry.id}
              className={`block pt-3 ${!entry.is_final ? 'opacity-50' : ''}`}
            >
              {/* Bubble with badge pinned to top-left corner */}
              <div className={`relative inline-block max-w-[80%] rounded-sm px-4 pt-2 pb-2 border ${palette.bg} ${palette.border} ${!entry.is_final ? 'italic' : ''}`}>
                {/* Badge */}
                <span className={`absolute -top-2 left-2 inline-flex items-center gap-1 px-1 py-px rounded-sm text-[8px] font-semibold border ${palette.badge}`}>
                  {name}
                  <span className="opacity-80 tabular-nums">{formatMs(entry.start_ms)}</span>
                </span>
                <p className={`text-sm leading-relaxed ${palette.text}`}>
                  {entry.text}
                </p>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
