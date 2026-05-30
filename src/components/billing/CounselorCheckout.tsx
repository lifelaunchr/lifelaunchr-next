'use client'

import { useState } from 'react'
import { useAuth, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://lifelaunchr.onrender.com'
const ALLOWLIST_ENABLED = process.env.NEXT_PUBLIC_CLERK_ALLOWLIST_ENABLED === 'true'

// Matches Stripe's graduated tier structure for price_1Tcu... (test) / price_1Tcak... (live)
// Graduated = tiers apply progressively; flat fee charged once when that tier is entered.
// Tier 1: units  1–3  → $0.00/unit, $0.00 flat
// Tier 2: units  4–25 → $5.99/unit, $29.95 flat (charged once when count > 3)
// Tier 3: units 26–75 → $4.99/unit, $0.00 flat
// Tier 4: units 76+   → $3.99/unit, $0.00 flat
function calculateMonthlyPrice(count: number): number {
  if (count <= 3) return 0
  let total = 0
  // Tier 2: units 4–25
  const tier2 = Math.min(count, 25) - 3
  total += tier2 * 5.99 + 29.95
  // Tier 3: units 26–75
  if (count > 25) total += (Math.min(count, 75) - 25) * 4.99
  // Tier 4: units 76+
  if (count > 75) total += (count - 75) * 3.99
  return total
}

// Marginal rate for the next student added at this count
function marginalRate(count: number): number {
  if (count <= 3)  return 0
  if (count <= 25) return 5.99
  if (count <= 75) return 4.99
  return 3.99
}

export default function CounselorCheckout() {
  const { getToken, isSignedIn } = useAuth()
  const [count, setCount]     = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const monthly = calculateMonthlyPrice(count)

  async function handleSubscribe() {
    setLoading(true)
    setError('')
    try {
      const token = await getToken()
      const res = await fetch(`${API}/billing/create-checkout-session`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ student_count: count }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Something went wrong')
      window.location.href = data.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong — try again or email help@lifelaunchr.com')
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#fff',
      border: '2px solid #3b82f6',
      borderRadius: 12,
      padding: '24px 28px',
      marginTop: 20,
    }}>
      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0c1b33', marginBottom: 4 }}>
        Subscribe now — beta pricing locked in forever
      </p>
      <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
        $29.95/month + per-student fee. Volume discounts apply automatically.
        Annual billing saves 20%.
      </p>

      {/* Student count picker */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
          How many students do you want on your plan?
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="number"
            min={4}
            max={500}
            value={count}
            onChange={e => setCount(Math.max(4, Math.min(500, parseInt(e.target.value) || 4)))}
            style={{
              width: 80,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: '1rem',
              fontWeight: 600,
              textAlign: 'center',
            }}
          />
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            students — ${marginalRate(count).toFixed(2)}/student (graduated) + $29.95 base
          </span>
        </div>
      </div>

      {/* Price preview */}
      <div style={{
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: 8,
        padding: '14px 18px',
        marginBottom: 20,
      }}>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monthly total</p>
        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0c1b33' }}>
          ${monthly.toFixed(2)}<span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#6b7280' }}>/mo</span>
        </p>
      </div>

      {error && (
        <p style={{ fontSize: '0.83rem', color: '#dc2626', marginBottom: 12 }}>{error}</p>
      )}

      {isSignedIn ? (
        <button
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            background: loading ? '#93c5fd' : '#3b82f6',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            padding: '11px 28px',
            borderRadius: 8,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {loading ? 'Redirecting to checkout…' : `Subscribe — ${count} students`}
        </button>
      ) : ALLOWLIST_ENABLED ? (
        /* Invite-only mode — open sign-up is disabled */
        <div>
          <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: 12, fontWeight: 500 }}>
            Soar is currently invite-only. Request access and we&apos;ll get you set up:
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              href="/#request-access"
              style={{
                flex: 1,
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '10px 16px',
                borderRadius: 8,
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block',
              }}
            >
              Request an invite →
            </Link>
            <SignInButton mode="modal" fallbackRedirectUrl="/upgrade">
              <button style={{
                flex: 1,
                background: '#fff',
                color: '#374151',
                fontWeight: 600,
                fontSize: '0.9rem',
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                cursor: 'pointer',
              }}>
                Sign in
              </button>
            </SignInButton>
          </div>
        </div>
      ) : (
        /* Open sign-up mode */
        <div>
          <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: 12, fontWeight: 500 }}>
            You&apos;ll need a free Soar account to subscribe:
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              href="/sign-up"
              style={{
                flex: 1,
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '10px 16px',
                borderRadius: 8,
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block',
              }}
            >
              Create free account
            </Link>
            <SignInButton mode="modal" fallbackRedirectUrl="/upgrade">
              <button style={{
                flex: 1,
                background: '#fff',
                color: '#374151',
                fontWeight: 600,
                fontSize: '0.9rem',
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                cursor: 'pointer',
              }}>
                Sign in
              </button>
            </SignInButton>
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 10, textAlign: 'center' }}>
        {isSignedIn
          ? <>Secure checkout via Stripe. Cancel anytime. Students and families?{' '}<a href="mailto:help@lifelaunchr.com" style={{ color: '#9ca3af' }}>Contact us to upgrade.</a></>
          : ALLOWLIST_ENABLED
            ? <>Already have an account? Sign in above. Questions? <a href="mailto:help@lifelaunchr.com" style={{ color: '#9ca3af' }}>Email us.</a></>
            : 'Free accounts include 3 students and 5 sessions/month — no credit card required.'
        }
      </p>
    </div>
  )
}
