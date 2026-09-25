'use client'

import { Zap } from 'lucide-react'

interface ContradictionAlertProps {
  question: string
  onDismiss: () => void
}

export default function ContradictionAlert({ question, onDismiss }: ContradictionAlertProps) {
  return (
    <div className="animate-slide-in flex items-start gap-3 bg-[#FFF8F0] border border-[#F4A259]/40 px-4 py-3">
      <Zap size={15} color="#F4A259" strokeWidth={2} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#F4A259] mb-1 uppercase tracking-wide">
          Mediator question
        </p>
        <p className="text-sm text-[#22303C] leading-relaxed">{question}</p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-[#C2CDD6] hover:text-[#5A6A75] transition-colors text-lg leading-none mt-0.5"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
