'use client'

import { useState, useRef, useCallback } from 'react'

interface UploadedSource {
  filename: string
  chunks: number
}

interface EvidenceUploadProps {
  sessionId: string
}

export default function EvidenceUpload({ sessionId }: EvidenceUploadProps) {
  const [sources, setSources] = useState<UploadedSource[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`http://localhost:8000/upload-evidence/${sessionId}`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        console.error('Upload failed:', err.detail)
        return
      }
      const data = await res.json()
      // Use the browser File.name (always a clean basename) rather than the
      // server-echoed filename, which may carry path separators or extra extensions.
      const cleanName = file.name
      setSources((prev) => [
        ...prev,
        { filename: cleanName, chunks: data.chunks_ingested },
      ])
    } finally {
      setUploading(false)
    }
  }, [sessionId])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      Array.from(files).forEach(uploadFile)
    },
    [uploadFile]
  )

  return (
    <div>
      <h3 className="text-xs font-semibold text-[#7b8096] uppercase tracking-wider mb-2">
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
        className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors text-xs ${
          dragging
            ? 'border-indigo-500 bg-indigo-950'
            : 'border-[#2a2d3a] hover:border-indigo-700'
        }`}
      >
        {uploading ? (
          <span className="text-[#7b8096] animate-pulse">Uploading…</span>
        ) : (
          <span className="text-[#4a4d5a]">Drop files or click · txt md csv pdf</span>
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

      {/* Source list */}
      {sources.length > 0 && (
        <ul className="mt-2 space-y-1">
          {sources.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-green-400">
              <span>✓</span>
              <span className="truncate">{s.filename}</span>
              <span className="text-[#4a4d5a] flex-shrink-0">({s.chunks} chunks)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
