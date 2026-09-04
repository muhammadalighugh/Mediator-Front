'use client'

import { useEffect, useRef } from 'react'
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

export default function LiveTranscript({ entries, speakers }: LiveTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)

  // Auto-scroll: pin to bottom unless user scrolled up
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
        <h2 className="text-sm font-semibold text-[#7b8096] uppercase tracking-wider">
          Live Transcript
        </h2>
        <span className="text-xs text-[#4a4d5a]">{entries.filter((e) => e.is_final).length} turns</span>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1"
      >
        {entries.length === 0 && (
          <p className="text-[#4a4d5a] text-sm italic mt-8 text-center">
            Waiting for speech…
          </p>
        )}

        {entries.map((entry) => {
          const speaker = entry.speaker_id ? speakerMap.get(entry.speaker_id) : null
          const color = speaker?.color ?? '#7b8096'
          const name = speaker?.display_name ?? (entry.speaker_id ?? '?')

          return (
            <div
              key={entry.id}
              className={`flex gap-3 items-start animate-fade-in ${!entry.is_final ? 'opacity-60' : ''}`}
            >
              {/* Speaker chip */}
              <div className="flex-shrink-0 mt-0.5">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: color + '33', color, border: `1px solid ${color}55` }}
                >
                  {name}
                </span>
              </div>

              {/* Text + timestamp */}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm leading-relaxed ${
                    entry.is_final
                      ? 'text-[#e8eaf0]'
                      : 'text-[#7b8096] italic'
                  }`}
                >
                  {entry.text}
                </span>
                <span className="ml-2 text-[10px] text-[#4a4d5a] tabular-nums">
                  {formatMs(entry.start_ms)}
                </span>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
