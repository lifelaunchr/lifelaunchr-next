'use client'

// Segment error boundary for /dashboard. If the My Students view throws during
// render (e.g. a hydration-recovery crash — see next#79), Next renders this in
// place of the page instead of unmounting to a silent blank roster. It reports to
// Sentry and gives the counselor two escape hatches: a plain reload, and a
// "clear cached data & reload" that unregisters any SAME-ORIGIN service worker and
// clears same-origin caches first (can't touch a browser extension's worker, but
// clears anything of ours that might be stale).
import * as Sentry from '@sentry/nextjs'
import { useEffect, useState } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  async function clearAndReload() {
    setClearing(true)
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(r => r.unregister()))
      }
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
    } catch {
      // best effort — reload regardless
    }
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-3">😕</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          We couldn&apos;t load your students
        </h1>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          Your students are safe — this is a display glitch on this device, not a problem with
          your account. Reloading almost always fixes it. If it keeps happening, use
          &ldquo;Clear cached data&rdquo; below, or try another browser.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Reload
          </button>
          <button
            onClick={clearAndReload}
            disabled={clearing}
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            {clearing ? 'Clearing…' : 'Clear cached data & reload'}
          </button>
        </div>
      </div>
    </div>
  )
}
