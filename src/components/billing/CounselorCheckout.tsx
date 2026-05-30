'use client'

import { useState } from 'react'
import { useAuth, SignInButton, SignUpButton } from '@clerk/nextjs'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://lifelaunchr.onrender.com'

// Matches Stripe's graduated tier structure for price_1Tcu... (test) / price_1Tcak... (live)
// Tier 1: 1–3 students  → $0
// Tier 2: 4–25 students → $29.95 flat + $5.95 × count
// Tier 3: 26–75 students → $29.95 flat + $4.95 × count
// Tier 4: 76+           → $29.95 flat + $3.95 × count
function calculateMonthlyPrice(count: number): number {
  if (count <= 3)  return 0
  if (count <= 25) return 29.95 + count * 5.95
  if (count <= 75) return 29.95 + count * 4.95
  return 29.95 + count * 3.95
}

function unitRate(count: number): number {
  if (count <= 3)  return 0
  if (count <= 25) return 5.95
  if (count <= 75) return 4.95
  return 3.95
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
            students × ${unitRate(count).toFixed(2)}/student + $29.95 base
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
      ) : (
        <div>
          <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: 12, fontWeight: 500 }}>
            You&apos;ll need a free Soar account to subscribe:
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <SignUpButton mode="modal" fallbackRedirectUrl="/upgrade">
              <button style={{
                flex: 1,
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
              }}>
                Create free account
              </button>
            </SignUpButton>
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
          : 'Free accounts include 3 students and 5 sessions/month — no credit card required.'
        }
      </p>
    </div>
  )
}
