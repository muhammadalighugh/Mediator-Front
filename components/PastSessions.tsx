'use client'

import { useEffect, useState } from 'react'

interface SessionDoc {
  session_id: string
  user_email: string | null
  created_at: string
  speakers: string[]
  claim_count: number
  summary: string
}

interface PastSessionsProps {
  email: string
}

export default function PastSessions({ email }: PastSessionsProps) {
  const [sessions, setSessions] = useState<SessionDoc[]>([])
  const [status, setStatus] = useState<'loading' | 'done' | 'empty' | 'error'>('loading')

  useEffect(() => {
    if (!email || email === 'guest@local') {
      setStatus('empty')
      return
    }

    let cancelled = false

    async function load() {
      try {
        const res = await fetch(
          `http://localhost:8000/sessions/${encodeURIComponent(email)}`,
        )
        if (cancelled) return

        if (!res.ok) { setStatus('empty'); return }

        const data: SessionDoc[] = await res.json()
        if (cancelled) return

        if (data.length === 0) {
          setStatus('empty')
        } else {
          setSessions(data.slice(0, 5))
          setStatus('done')
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    load()
    return () => { cancelled = true }
  }, [email])

  if (status === 'loading' || status === 'empty' || status === 'error') return null

  return (
    <div className="w-full max-w-md mt-6">
      <p className="text-xs text-[#9EAAB8] uppercase tracking-widest mb-3 font-medium">
        Past sessions
      </p>

      <div className="space-y-2">
        {sessions.map((s) => (
          <div
            key={s.session_id}
            className="bg-white border border-[#E2E8ED] px-4 py-3 rounded-lg"
          >
            {/* Date + claim count row */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[#9EAAB8]">
                {new Date(s.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-[11px] text-[#C2CDD6]">
                {s.claim_count} claim{s.claim_count !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Speakers */}
            {s.speakers.length > 0 && (
              <p className="text-[12px] text-[#5A6A75] mb-1 font-medium">
                {s.speakers.join(' · ')}
              </p>
            )}

            {/* Summary */}
            {s.summary && (
              <p className="text-[12px] text-[#9EAAB8] leading-relaxed line-clamp-2">
                {s.summary}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
