'use client'

interface LimitModalProps {
  messagesUsed: number
  limit: number
  resetDate?: string
  supportEmail?: string
  isSessionLimit?: boolean
  onClose: () => void
}

export function LimitModal({ messagesUsed, limit, resetDate, supportEmail = 'help@lifelaunchr.com', isSessionLimit = false, onClose }: LimitModalProps) {
  const resetLabel = resetDate
    ? new Date(resetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : 'next month'
  const unit = isSessionLimit ? 'research sessions' : 'messages'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-7 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚡</span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
          Monthly limit reached
        </h3>

        <p className="text-sm text-gray-500 text-center mb-5 leading-relaxed">
          You&apos;ve used {messagesUsed} of {limit} included {unit} this month. Your limit resets on{' '}
          <strong className="text-gray-700">{resetLabel}</strong>.
        </p>

        <div className="flex flex-col gap-2">
          <a
            href="/upgrade"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl text-center transition-colors"
          >
            Learn about upgrades →
          </a>
          <button
            onClick={onClose}
            className="w-full border border-gray-200 hover:border-gray-300 text-gray-600 text-sm py-2.5 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Questions?{' '}
          <a
            href={`mailto:${supportEmail}`}
            className="underline hover:text-gray-600"
          >
            Email support
          </a>
        </p>
      </div>
    </div>
  )
}
