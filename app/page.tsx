'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { connect } from '@/lib/websocket'
import { playDemo } from '@/lib/demoPlayer'

const DEMO_SPEAKERS = ['Alex', 'Sam']
const DEMO_EVIDENCE_FILES = [
  '/demo/sample_evidence/expense_log.csv',
  '/demo/sample_evidence/messages.txt',
]

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function HomePage() {
  const router = useRouter()
  const [speakerA, setSpeakerA] = useState('Alex')
  const [speakerB, setSpeakerB] = useState('Sam')
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
  const [demoState, setDemoState] = useState<'idle' | 'running' | 'error'>('idle')
  const [demoError, setDemoError] = useState('')
  const [demoProgress, setDemoProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // ------------------------------------------------------------------
  // Live session start
  // ------------------------------------------------------------------
  async function handleStart() {
    const a = speakerA.trim() || 'Speaker A'
    const b = speakerB.trim() || 'Speaker B'
    const id = generateSessionId()

    // Pre-create session and upload any evidence before navigating
    const sock = connect(id, { maxAttempts: 0 })
    // Wait for WS open before sending start_session
    await new Promise<void>((res, rej) => {
      const t = setTimeout(() => rej(new Error('WS timeout')), 5000)
      const iv = setInterval(() => {
        if (sock.readyState === WebSocket.OPEN) {
          clearTimeout(t)
          clearInterval(iv)
          res()
        }
      }, 50)
    })
    sock.send({ type: 'start_session', speakers: [a, b] })

    // Upload any evidence files
    for (const f of evidenceFiles) {
      const form = new FormData()
      form.append('file', f)
      await fetch(`http://localhost:8000/upload-evidence/${id}`, {
        method: 'POST',
        body: form,
      }).catch(console.warn)
    }

    // Disconnect WS — session page will reconnect
    sock.disconnect()
    router.push(`/session/${id}?speakers=${encodeURIComponent(JSON.stringify([a, b]))}`)
  }

  // ------------------------------------------------------------------
  // Scripted demo
  // ------------------------------------------------------------------
  async function handleDemo() {
    if (demoState === 'running') return
    setDemoState('running')
    setDemoError('')

    const id = generateSessionId()

    try {
      const sock = connect(id, { maxAttempts: 3 })

      // Wait for WS connection
      await new Promise<void>((res, rej) => {
        const t = setTimeout(() => rej(new Error('Backend not reachable — is uvicorn running?')), 6000)
        const iv = setInterval(() => {
          if (sock.readyState === WebSocket.OPEN) {
            clearTimeout(t); clearInterval(iv); res()
          }
        }, 50)
      })

      sock.send({ type: 'start_session', speakers: DEMO_SPEAKERS })

      // Auto-upload demo evidence files
      for (const path of DEMO_EVIDENCE_FILES) {
        const res = await fetch(path)
        if (!res.ok) continue
        const blob = await res.blob()
        const filename = path.split('/').pop()!
        const form = new FormData()
        form.append('file', new File([blob], filename))
        await fetch(`http://localhost:8000/upload-evidence/${id}`, {
          method: 'POST',
          body: form,
        }).catch(console.warn)
      }

      // Navigate — the session page will receive the audio stream
      // Store demo socket id in sessionStorage for the session page to pick up
      sessionStorage.setItem('demo_session_id', id)
      sessionStorage.setItem('demo_speakers', JSON.stringify(DEMO_SPEAKERS))

      router.push(
        `/session/${id}?speakers=${encodeURIComponent(JSON.stringify(DEMO_SPEAKERS))}&demo=1`
      )
      // Keep sock open; the session page will reuse it or reconnect
      sock.disconnect()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setDemoState('error')
      setDemoError(msg)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Hero */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs font-medium tracking-wide">
          ⚖️ AI MEDIATOR
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          Argument Mediator
        </h1>
        <p className="text-[#7b8096] max-w-md text-sm leading-relaxed">
          Transcribes both sides live, extracts factual claims, matches them against
          evidence, and produces a verdict report — without declaring a winner.
        </p>
      </div>

      {/* Session form */}
      <div className="w-full max-w-md bg-[#1a1d27] rounded-2xl border border-[#2a2d3a] p-8 shadow-xl">
        <h2 className="text-white font-semibold mb-6">New Session</h2>

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <label className="text-xs text-[#7b8096] mb-1 block">Speaker 1</label>
            <input
              value={speakerA}
              onChange={(e) => setSpeakerA(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="Alex"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-[#7b8096] mb-1 block">Speaker 2</label>
            <input
              value={speakerB}
              onChange={(e) => setSpeakerB(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="Sam"
            />
          </div>
        </div>

        {/* Evidence upload */}
        <div className="mb-6">
          <label className="text-xs text-[#7b8096] mb-1 block">
            Evidence files <span className="text-[#4a4d5a]">(optional · txt, md, csv, pdf)</span>
          </label>
          <div
            className="border border-dashed border-[#2a2d3a] rounded-lg p-4 text-center cursor-pointer hover:border-indigo-600 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {evidenceFiles.length === 0 ? (
              <p className="text-[#7b8096] text-xs">Click or drag files here</p>
            ) : (
              <ul className="text-xs text-indigo-300 space-y-1">
                {evidenceFiles.map((f) => (
                  <li key={f.name}>📎 {f.name}</li>
                ))}
              </ul>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            multiple
            accept=".txt,.md,.csv,.pdf"
            onChange={(e) =>
              setEvidenceFiles(Array.from(e.target.files ?? []))
            }
          />
        </div>

        <button
          onClick={handleStart}
          className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Start live session →
        </button>
      </div>

      {/* Demo button */}
      <div className="mt-6 w-full max-w-md">
        <div className="relative flex items-center mb-4">
          <div className="flex-1 border-t border-[#2a2d3a]" />
          <span className="px-3 text-xs text-[#4a4d5a]">or try the demo</span>
          <div className="flex-1 border-t border-[#2a2d3a]" />
        </div>

        {demoState === 'error' && (
          <div className="mb-3 px-4 py-3 bg-red-950 border border-red-800 rounded-xl text-red-300 text-xs">
            ⚠️ {demoError}
          </div>
        )}

        <button
          onClick={handleDemo}
          disabled={demoState === 'running'}
          className="w-full border border-indigo-700 text-indigo-300 hover:bg-indigo-950 disabled:opacity-50 font-medium py-3 rounded-xl transition-colors text-sm"
        >
          {demoState === 'running' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-pulse">●</span> Starting demo…
            </span>
          ) : (
            '▶ Run scripted demo (no microphone needed)'
          )}
        </button>
        <p className="mt-2 text-center text-xs text-[#4a4d5a]">
          Streams a pre-recorded argument through the full pipeline
        </p>
      </div>
    </main>
  )
}
