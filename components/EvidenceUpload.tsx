'use client'

import { useState, useRef, useCallback } from 'react'
import { Paperclip, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { getAuthToken } from '@/lib/useRequireAuth'

const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8000'

interface SourceEntry {
  filename: string
  chunks: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

interface EvidenceUploadProps {
  sessionId: string
}

export default function EvidenceUpload({ sessionId }: EvidenceUploadProps) {
  const [sources, setSources]   = useState<SourceEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // true while any file is still in the 'uploading' state
  const isUploading = sources.some((s) => s.status === 'uploading')

  const uploadFile = useCallback(async (file: File) => {
    const name = file.name

    // Add a placeholder row immediately so the user sees feedback at once
    setSources((prev) => [
      ...prev,
      { filename: name, chunks: 0, status: 'uploading' },
    ])

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch(`${API_BASE}/upload-evidence/${sessionId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: form,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        setSources((prev) =>
          prev.map((s) =>
            s.filename === name && s.status === 'uploading'
              ? { ...s, status: 'error', error: err.detail ?? 'Upload failed' }
              : s
          )
        )
        return
      }

      const data = await res.json()
      setSources((prev) =>
        prev.map((s) =>
          s.filename === name && s.status === 'uploading'
            ? { ...s, status: 'done', chunks: data.chunks_ingested }
            : s
        )
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      setSources((prev) =>
        prev.map((s) =>
          s.filename === name && s.status === 'uploading'
            ? { ...s, status: 'error', error: msg }
            : s
        )
      )
    }
  }, [sessionId])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files) Array.from(files).forEach(uploadFile)
    },
    [uploadFile],
  )

  return (
    <div>
      {/* Header */}
      <h3 className="text-xs font-semibold text-[#003017] uppercase tracking-wider mb-2">
        Evidence
      </h3>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => fileRef.current?.click()}
        className={`flex items-center gap-2 border border-dashed rounded-sm px-3 py-2.5 cursor-pointer transition-colors text-xs ${
          dragging
            ? 'border-[#003017] bg-[#003017]/8 text-[#003017]'
            : 'border-[#003017]/30 hover:border-[#003017] hover:bg-[#003017]/5 text-[#5A6A75]'
        }`}
      >
        <Paperclip size={13} strokeWidth={2} className="flex-shrink-0 text-[#003017]/60" />
        {isUploading ? (
          <span className="flex items-center gap-1.5 text-[#003017]">
            <Loader2 size={12} strokeWidth={2} className="animate-spin" />
            Uploading…
          </span>
        ) : (
          <span>
            Drop files or click ·{' '}
            <span className="text-[#003017]/50">txt&nbsp; md&nbsp; csv&nbsp; pdf</span>
          </span>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        multiple
        accept=".txt,.md,.csv,.pdf"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Per-file status list */}
      {sources.length > 0 && (
        <ul className="mt-2 space-y-1">
          {sources.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs min-w-0">
              {s.status === 'uploading' && (
                <Loader2
                  size={11}
                  strokeWidth={2}
                  className="animate-spin text-[#003017]/60 flex-shrink-0"
                />
              )}
              {s.status === 'done' && (
                <CheckCircle size={11} strokeWidth={2} className="text-[#003017] flex-shrink-0" />
              )}
              {s.status === 'error' && (
                <AlertCircle size={11} strokeWidth={2} className="text-red-500 flex-shrink-0" />
              )}

              <span
                className={`truncate font-medium ${
                  s.status === 'error' ? 'text-red-600' : 'text-[#22303C]'
                }`}
              >
                {s.filename}
              </span>

              {s.status === 'uploading' && (
                <span className="text-[#C2CDD6] flex-shrink-0">uploading…</span>
              )}
              {s.status === 'done' && (
                <span className="text-[#C2CDD6] flex-shrink-0">{s.chunks} chunks</span>
              )}
              {s.status === 'error' && (
                <span className="text-red-400 flex-shrink-0 truncate">{s.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
