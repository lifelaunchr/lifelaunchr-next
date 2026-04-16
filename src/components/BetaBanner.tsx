'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'

const BANNER_KEY = 'beta_banner_dismissed_at'
const REAPPEAR_DAYS = 7

export default function BetaBanner() {
  const { isSignedIn } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isSignedIn) return
    const dismissedAt = localStorage.getItem(BANNER_KEY)
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24)
      if (daysSince < REAPPEAR_DAYS) return
    }
    setVisible(true)
  }, [isSignedIn])

  const dismiss = () => {
    localStorage.setItem(BANNER_KEY, String(Date.now()))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      backgroundColor: '#1e293b',
      color: '#cbd5e1',
      fontSize: '0.8125rem',
      textAlign: 'center',
      padding: '8px 40px',
      position: 'relative',
      zIndex: 50,
      lineHeight: '1.4',
    }}>
      Soar is in private beta. You&rsquo;re among our first users &mdash; we&rsquo;d love your feedback.{' '}
      <a href="mailto:help@lifelaunchr.com" style={{ color: '#93c5fd', textDecoration: 'underline' }}>
        Email us at help@lifelaunchr.com
      </a>
      <button
        onClick={dismiss}
        aria-label="Dismiss beta banner"
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
