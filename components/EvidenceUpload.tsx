'use client'

import { useState, useRef, useCallback } from 'react'
import { Paperclip, CheckCircle } from 'lucide-react'

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
      const cleanName = file.name.replace(/\.(?:txt|md|csv|pdf)(\.(?:txt|md|csv|pdf))$/i, '$1')
      setSources((prev) => [...prev, { filename: cleanName, chunks: data.chunks_ingested }])
    } finally {
      setUploading(false)
    }
  }, [sessionId])

  const handleFiles = useCallback(
    (files: FileList | null) => { if (files) Array.from(files).forEach(uploadFile) },
    [uploadFile]
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
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}
        className={`flex items-center gap-2 border border-dashed rounded-sm px-3 py-2.5 cursor-pointer transition-colors text-xs ${
          dragging
            ? 'border-[#003017] bg-[#003017]/8 text-[#003017]'
            : 'border-[#003017]/30 hover:border-[#003017] hover:bg-[#003017]/5 text-[#5A6A75]'
        }`}
      >
        <Paperclip size={13} strokeWidth={2} className="flex-shrink-0 text-[#003017]/60" />
        {uploading
          ? <span className="text-[#003017] animate-pulse">Uploading…</span>
          : <span>Drop files or click · <span className="text-[#003017]/50">txt  md  csv  pdf</span></span>
        }
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        multiple
        accept=".txt,.md,.csv,.pdf"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Uploaded files */}
      {sources.length > 0 && (
        <ul className="mt-2 space-y-1">
          {sources.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs">
              <CheckCircle size={11} strokeWidth={2} className="text-[#003017] flex-shrink-0" />
              <span className="truncate text-[#22303C] font-medium">{s.filename}</span>
              <span className="text-[#C2CDD6] flex-shrink-0">{s.chunks} chunks</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
