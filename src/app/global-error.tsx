'use client'

// Root error boundary. Next renders this ONLY when the root layout itself throws,
// replacing the whole document — so it must render its own <html>/<body>. It also
// reports to Sentry, which (together with the instrumentation files) is what turns
// "silent blank page" into a captured, source-mapped error (next#78 / next#79).
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#111827',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5 }}>
            The page hit an unexpected error. Reloading usually fixes it. Your data is safe —
            nothing was lost.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '8px 20px',
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              background: '#2563eb',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
