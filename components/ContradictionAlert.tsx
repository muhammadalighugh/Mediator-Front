'use client'

interface ContradictionAlertProps {
  question: string
  onDismiss: () => void
}

export default function ContradictionAlert({ question, onDismiss }: ContradictionAlertProps) {
  return (
    <div className="animate-slide-in flex items-start gap-3 bg-amber-950 border border-amber-700 rounded-xl px-4 py-3">
      <span className="text-amber-400 text-lg mt-0.5 flex-shrink-0">⚡</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-300 mb-1 uppercase tracking-wide">
          Mediator question
        </p>
        <p className="text-sm text-amber-100 leading-relaxed">{question}</p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-amber-600 hover:text-amber-400 transition-colors text-lg leading-none mt-0.5"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
