'use client'

import { useEffect, useRef, useState } from 'react'

// The commit this bundle was built from (baked in at build time via next.config.ts `env`).
// On Vercel this is the deploy's git SHA; locally it is 'dev'.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev'
const POLL_MS = 5 * 60 * 1000 // check every 5 minutes

/**
 * Detects when a newer version of the app has deployed while this tab stayed open,
 * and offers a one-click reload (next#85). Background: our HTML is `no-store` and JS
 * chunks are content-hashed, so any real reload already lands on fresh code — the only
 * stragglers are long-open tabs that never re-request (the shape of next#79). This
 * closes that gap. It never force-reloads (a counselor may be mid-typing a report);
 * it surfaces a dismissible banner instead.
 *
 * Safe-by-construction against hydration: it renders null until a check finds a new
 * version (post-mount, client-only), so server and first client render both produce
 * nothing — no hydration mismatch.
 */
export default function VersionBanner() {
  const [newVersion, setNewVersion] = useState<string | null>(null)
  const dismissedRef = useRef<string | null>(null)

  useEffect(() => {
    // No build signal in local dev — don't poll or nag.
    if (BUILD_ID === 'dev') return

    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const server = typeof data?.version === 'string' ? data.version : ''
        if (cancelled) return
        // Only prompt when the server is on a real, different build than ours, and the
        // user hasn't already dismissed this exact version.
        if (server && server !== 'dev' && server !== BUILD_ID && server !== dismissedRef.current) {
          setNewVersion(server)
        }
      } catch {
        // offline / transient — never nag on a failed check
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }

    const id = setInterval(check, POLL_MS)
    document.addEventListener('visibilitychange', onVisible)
    check() // one check on mount (no-op unless a deploy already happened)

    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (!newVersion) return null

  const dismiss = () => {
    dismissedRef.current = newVersion
    setNewVersion(null)
  }

  return (
    <div
      style={{
        backgroundColor: '#0c1b33',
        color: '#e2e8f0',
        fontSize: '0.8125rem',
        textAlign: 'center',
        padding: '8px 44px',
        position: 'relative',
        zIndex: 60,
        lineHeight: '1.4',
      }}
    >
      A new version of Soar is available.{' '}
      <button
        onClick={() => window.location.reload()}
        style={{
          display: 'inline-block',
          marginLeft: '4px',
          backgroundColor: '#7dd3fc',
          color: '#0c1b33',
          border: 'none',
          borderRadius: '9999px',
          padding: '3px 12px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          cursor: 'pointer',
          lineHeight: 1.2,
        }}
      >
        Reload
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss update notice"
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '4px',
        }}
      >
        ✕
      </button>
    </div>
  )
}
