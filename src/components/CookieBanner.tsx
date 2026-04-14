'use client'

import { useEffect, useState } from 'react'

const CONSENT_KEY = 'cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if GA is configured and consent not yet given
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    if (!gaId) return
    if (localStorage.getItem(CONSENT_KEY)) return
    setVisible(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem(CONSENT_KEY, 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-gray-200 border-t border-gray-700">
      <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between gap-4 text-sm">
        <span>
          Soar uses cookies for authentication and analytics.{' '}
          <a
            href="/privacy"
            className="underline hover:text-white transition-colors"
          >
            Learn more
          </a>
        </span>
        <button
          onClick={dismiss}
          className="shrink-0 rounded bg-white text-gray-900 px-4 py-1.5 text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
