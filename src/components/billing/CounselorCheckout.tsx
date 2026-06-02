'use client'

import { useState, useEffect } from 'react'
import { useAuth, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://lifelaunchr.onrender.com'
const ALLOWLIST_ENABLED = process.env.NEXT_PUBLIC_CLERK_ALLOWLIST_ENABLED === 'true'

interface PriceTier {
  unit_amount: number   // dollars
  flat_amount: number   // dollars
  up_to: number | null  // null = unlimited final tier
}

// Hardcoded fallback — used if the API call fails.
// Keep in sync with Stripe if prices ever change, but ideally the live fetch below takes over.
const FALLBACK_TIERS_MONTHLY: PriceTier[] = [
  { unit_amount: 0,    flat_amount: 0,      up_to: 3  },
  { unit_amount: 5.99, flat_amount: 29.95,  up_to: 25 },
  { unit_amount: 4.99, flat_amount: 0,      up_to: 75 },
  { unit_amount: 3.99, flat_amount: 0,      up_to: null },
]
const FALLBACK_TIERS_ANNUAL: PriceTier[] = [
  { unit_amount: 0,     flat_amount: 0,       up_to: 3  },
  { unit_amount: 59.90, flat_amount: 299.50,  up_to: 25 },
  { unit_amount: 49.90, flat_amount: 0,       up_to: 75 },
  { unit_amount: 39.90, flat_amount: 0,       up_to: null },
]

// Graduated: tiers apply progressively; flat fee charged once per tier entered.
function calculateFromTiers(tiers: PriceTier[], count: number): number {
  let total = 0
  let tierStart = 1
  for (const tier of tiers) {
    const tierEnd = tier.up_to ?? Infinity
    if (count < tierStart) break
    const unitsInTier = Math.min(count, tierEnd) - tierStart + 1
    if (unitsInTier > 0) {
      total += unitsInTier * tier.unit_amount
      if (tier.flat_amount > 0) total += tier.flat_amount
    }
    tierStart = (tier.up_to ?? 0) + 1
  }
  return total
}

// Per-unit rate for the tier containing `count`
function marginalRate(tiers: PriceTier[], count: number): number {
  let tierStart = 1
  for (const tier of tiers) {
    const tierEnd = tier.up_to ?? Infinity
    if (count >= tierStart && count <= tierEnd) return tier.unit_amount
    tierStart = (tier.up_to ?? 0) + 1
  }
  return 0
}

export default function CounselorCheckout() {
  const { getToken, isSignedIn } = useAuth()
  const [count, setCount]                   = useState(10)
  const [activeStudentCount, setActiveStudentCount] = useState<number>(0)
  const [isTenantAdmin, setIsTenantAdmin]   = useState<boolean | null>(null)
  const [isSubscribed, setIsSubscribed]     = useState(false)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')
  const [interval, setInterval]             = useState<'monthly' | 'annual'>('monthly')
  const [tiersMonthly, setTiersMonthly]     = useState<PriceTier[]>(FALLBACK_TIERS_MONTHLY)
  const [tiersAnnual, setTiersAnnual]       = useState<PriceTier[]>(FALLBACK_TIERS_ANNUAL)

  const tiers = interval === 'annual' ? tiersAnnual : tiersMonthly

  // Fetch live price tiers for both intervals (auth required; unauthenticated visitors use fallback)
  useEffect(() => {
    if (!isSignedIn) return
    getToken().then(token => {
      const headers = { Authorization: `Bearer ${token}` }
      fetch(`${API}/billing/price-tiers?interval=monthly`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.tiers?.length) setTiersMonthly(d.tiers) })
        .catch(() => {/* keep fallback */})
      fetch(`${API}/billing/price-tiers?interval=annual`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.tiers?.length) setTiersAnnual(d.tiers) })
        .catch(() => {/* keep fallback */})
    })
  }, [isSignedIn, getToken])

  // When signed in, check tenant admin status and fetch active student count
  useEffect(() => {
    if (!isSignedIn) return
    getToken().then(token => {
      fetch(`${API}/my-usage`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) setIsTenantAdmin(!!data.is_tenant_admin)
        })
        .catch(() => {})

      // Fetch tenant-wide active student count via subscription-status
      fetch(`${API}/billing/subscription-status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && typeof data.active_student_count === 'number') {
            const n = data.active_student_count
            setActiveStudentCount(n)
            setCount(Math.max(n, 4))
          }
          // If already subscribed (active Stripe subscription), show manage link instead of checkout form
          if (data?.is_subscribed) {
            setIsSubscribed(true)
          }
        })
        .catch(() => {
          // Fallback: fetch /my-students for counselor-level count
          fetch(`${API}/my-students`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (Array.isArray(data) && data.length > 0) {
                const n = data.length
                setActiveStudentCount(n)
                setCount(Math.max(n, 4))
              }
            })
            .catch(() => {})
        })
    })
  }, [isSignedIn, getToken])

  const total   = calculateFromTiers(tiers, count)
  const isAnnual = interval === 'annual'

  async function handleSubscribe() {
    setLoading(true)
    setError('')
    try {
      const token = await getToken()
      const res = await fetch(`${API}/billing/create-checkout-session`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ student_count: count, billing_interval: interval }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Something went wrong')
      window.location.href = data.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong — try again or email help@lifelaunchr.com')
      setLoading(false)
    }
  }

  // Signed-in tenant admin who is already subscribed: show manage link
  if (isSignedIn && isTenantAdmin && isSubscribed) {
    return (
      <div style={{
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: 12,
        padding: '20px 28px',
        marginTop: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#166534', marginBottom: 4 }}>
            ✓ Your practice has an active Soar subscription.
          </p>
          <p style={{ fontSize: '0.85rem', color: '#15803d', lineHeight: 1.5 }}>
            Manage your plan, update student count, or view invoices.
          </p>
        </div>
        <a
          href="/settings/billing"
          style={{
            background: '#16a34a',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.9rem',
            padding: '9px 20px',
            borderRadius: 8,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Manage subscription →
        </a>
      </div>
    )
  }

  // Signed-in non-admin: show contact-admin message
  if (isSignedIn && isTenantAdmin === false) {
    return (
      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '24px 28px',
        marginTop: 20,
      }}>
        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          Your practice admin manages the subscription.
        </p>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.6 }}>
          Contact your practice admin to update the plan or add more students.
          Questions? <a href="mailto:help@lifelaunchr.com" style={{ color: '#3b82f6' }}>Email us.</a>
        </p>
      </div>
    )
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
        Annual billing — 2 months free.
      </p>

      {/* Billing interval toggle */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
          Billing interval
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['monthly', 'annual'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setInterval(opt)}
              style={{
                padding: '7px 18px',
                borderRadius: 8,
                border: interval === opt ? '2px solid #3b82f6' : '1px solid #d1d5db',
                background: interval === opt ? '#eff6ff' : '#fff',
                color: interval === opt ? '#1d4ed8' : '#374151',
                fontWeight: interval === opt ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {opt === 'monthly' ? 'Monthly' : 'Annual — 2 months free'}
            </button>
          ))}
        </div>
      </div>

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
            {isAnnual
              ? `students — $${marginalRate(tiers, count).toFixed(2)}/student/year (graduated) + $299.50 base/year`
              : `students — $${marginalRate(tiers, count).toFixed(2)}/student (graduated) + $29.95 base`
            }
          </span>
        </div>

        {/* Warn if selected count is below their actual student count */}
        {activeStudentCount > 0 && count < activeStudentCount && (
          <div style={{
            marginTop: 10,
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: '0.82rem',
            color: '#92400e',
            lineHeight: 1.5,
          }}>
            ⚠️ Your practice currently has <strong>{activeStudentCount} active students</strong>.
            Set this to at least {activeStudentCount} so all of them are covered by your plan.
          </div>
        )}

        {/* Confirm when count matches or exceeds their actual student count */}
        {activeStudentCount > 0 && count >= activeStudentCount && (
          <p style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: 8 }}>
            ✓ Covers all {activeStudentCount}{' '}of your practice&apos;s current students
          </p>
        )}
      </div>

      {/* Price preview */}
      <div style={{
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: 8,
        padding: '14px 18px',
        marginBottom: 20,
      }}>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {isAnnual ? 'Annual total (billed once per year)' : 'Monthly total'}
        </p>
        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0c1b33' }}>
          ${total.toFixed(2)}
          <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#6b7280' }}>
            {isAnnual ? '/yr' : '/mo'}
          </span>
        </p>
        {isAnnual && (
          <p style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: 4 }}>
            Saves ${(calculateFromTiers(tiersMonthly, count) * 12 - total).toFixed(2)} vs. monthly
          </p>
        )}
      </div>

      {error && (
        <p style={{ fontSize: '0.83rem', color: '#dc2626', marginBottom: 12 }}>{error}</p>
      )}

      {isSignedIn ? (
        <button
          onClick={handleSubscribe}
          disabled={loading || count < activeStudentCount}
          style={{
            background: (loading || count < activeStudentCount) ? '#93c5fd' : '#3b82f6',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            padding: '11px 28px',
            borderRadius: 8,
            border: 'none',
            cursor: (loading || count < activeStudentCount) ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {loading ? 'Redirecting to checkout…' : `Subscribe — ${count} students${isAnnual ? ' (annual)' : ''}`}
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
