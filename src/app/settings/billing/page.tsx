'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://lifelaunchr.onrender.com'

interface SubscriptionStatus {
  plan: string
  student_count: number
  active_student_count: number
  renewal_date: number | null   // Unix timestamp from Stripe
  billing_interval: 'monthly' | 'annual'
  period_total: number | null
}

function formatDate(ts: number | null): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function BillingPage() {
  const { getToken, isSignedIn, isLoaded } = useAuth()

  const [status, setStatus]         = useState<SubscriptionStatus | null>(null)
  const [isTenantAdmin, setIsTenantAdmin] = useState<boolean | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  // Update plan state
  const [newCount, setNewCount]     = useState<number>(4)
  const [updating, setUpdating]     = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [prorationPreview, setProrationPreview] = useState<number | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Portal
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    getToken().then(token => {
      const headers = { Authorization: `Bearer ${token}` }

      // Check tenant admin status
      fetch(`${API}/my-usage`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setIsTenantAdmin(!!d.is_tenant_admin) })
        .catch(() => {})

      // Fetch subscription status
      fetch(`${API}/billing/subscription-status`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            setStatus(d)
            setNewCount(Math.max(d.student_count, d.active_student_count, 4))
          }
        })
        .catch(() => {})
        .finally(() => setLoadingStatus(false))
    })
  }, [isLoaded, isSignedIn, getToken])

  async function handleDryRun() {
    if (!status?.billing_interval || status.billing_interval !== 'annual') {
      // Monthly — no proration preview needed, go straight to confirm
      setShowConfirm(true)
      return
    }
    setUpdating(true)
    setUpdateError('')
    try {
      const token = await getToken()
      const res = await fetch(`${API}/billing/update-student-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ student_count: newCount, dry_run: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Something went wrong')
      setProrationPreview(data.proration_amount ?? null)
      setShowConfirm(true)
    } catch (e: unknown) {
      setUpdateError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setUpdating(false)
    }
  }

  async function handleConfirmUpdate() {
    setUpdating(true)
    setUpdateError('')
    try {
      const token = await getToken()
      const res = await fetch(`${API}/billing/update-student-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ student_count: newCount, dry_run: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Something went wrong')
      // Refresh status
      const token2 = await getToken()
      const refreshed = await fetch(`${API}/billing/subscription-status`, {
        headers: { Authorization: `Bearer ${token2}` },
      })
      if (refreshed.ok) setStatus(await refreshed.json())
      setShowConfirm(false)
      setProrationPreview(null)
    } catch (e: unknown) {
      setUpdateError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setUpdating(false)
    }
  }

  async function handleOpenPortal() {
    setPortalLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API}/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ return_url: window.location.href }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Something went wrong')
      window.location.href = data.url
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Could not open billing portal')
      setPortalLoading(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!isLoaded || loadingStatus) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280', fontFamily: 'system-ui, sans-serif' }}>
        Loading…
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#374151' }}>Sign in to manage your subscription.</p>
        <Link href="/sign-in" style={{ color: '#3b82f6', fontWeight: 600 }}>Sign in →</Link>
      </div>
    )
  }

  if (isTenantAdmin === false) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <p style={{ fontWeight: 600, color: '#374151', marginBottom: 8 }}>Your practice admin manages the subscription.</p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Contact your practice admin to make changes to the plan.
            Questions? <a href="mailto:help@lifelaunchr.com" style={{ color: '#3b82f6' }}>Email us.</a>
          </p>
        </div>
      </div>
    )
  }

  const isSubscribed = status?.plan && status.plan !== 'counselor_starter' && status.plan !== 'free'
  const isAnnual = status?.billing_interval === 'annual'
  const countChanged = newCount !== (status?.student_count ?? 0)

  // ── Free / unsubscribed ───────────────────────────────────────────────────
  if (!isSubscribed) {
    return (
      <div style={pageWrap}>
        <h1 style={h1}>Billing & Plan</h1>
        <div style={card}>
          <p style={{ fontWeight: 700, color: '#0c1b33', marginBottom: 4 }}>You&apos;re on the free plan</p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 20 }}>
            Free includes up to 3 active students and 5 research sessions/month.
          </p>
          <Link
            href="/upgrade"
            style={{
              display: 'inline-block',
              background: '#3b82f6',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
              padding: '10px 22px',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            View plans & upgrade →
          </Link>
        </div>
      </div>
    )
  }

  // ── Subscribed ────────────────────────────────────────────────────────────
  return (
    <div style={pageWrap}>
      <h1 style={h1}>Billing & Plan</h1>

      {/* Current plan summary */}
      <div style={card}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Current plan
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <Stat label="Billing" value={isAnnual ? 'Annual' : 'Monthly'} />
          <Stat label="Students on plan" value={`${status?.student_count ?? '—'}`} />
          <Stat label="Active students" value={`${status?.active_student_count ?? '—'}`} />
          <Stat
            label={isAnnual ? 'Annual total' : 'Monthly total'}
            value={status?.period_total != null ? `$${status.period_total.toFixed(2)}` : '—'}
          />
          <Stat
            label={isAnnual ? 'Next renewal' : 'Next billing date'}
            value={formatDate(status?.renewal_date ?? null)}
          />
        </div>

        {/* Over-limit warning */}
        {status && status.active_student_count > status.student_count && (
          <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', color: '#dc2626' }}>
            ⚠️ Your practice has <strong>{status.active_student_count} active students</strong> but your plan only covers <strong>{status.student_count}</strong>. Update your plan below to cover everyone.
          </div>
        )}
      </div>

      {/* Update plan size */}
      <div style={card}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Update plan size
        </p>
        <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: 14, lineHeight: 1.6 }}>
          Change the number of students covered by your plan.
          {isAnnual && ' For annual plans, unused time on your current count is prorated.'}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <input
            type="number"
            min={Math.max(status?.active_student_count ?? 4, 4)}
            max={500}
            value={newCount}
            onChange={e => {
              const v = Math.max(
                Math.max(status?.active_student_count ?? 4, 4),
                Math.min(500, parseInt(e.target.value) || 4)
              )
              setNewCount(v)
              setShowConfirm(false)
              setProrationPreview(null)
            }}
            style={{ width: 80, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '1rem', fontWeight: 600, textAlign: 'center' }}
          />
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>students</span>
        </div>

        {status && newCount < status.active_student_count && (
          <p style={{ fontSize: '0.82rem', color: '#dc2626', marginBottom: 12 }}>
            ⚠️ Must be at least {status.active_student_count} to cover all active students.
          </p>
        )}

        {/* Proration preview (annual only) */}
        {showConfirm && isAnnual && prorationPreview !== null && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 16px', marginBottom: 14, fontSize: '0.85rem', color: '#0c4a6e' }}>
            {prorationPreview >= 0
              ? <>A prorated charge of <strong>${prorationPreview.toFixed(2)}</strong> will be applied today for the additional students.</>
              : <>A prorated credit of <strong>${Math.abs(prorationPreview).toFixed(2)}</strong> will be applied to your next invoice.</>
            }
          </div>
        )}

        {/* Monthly confirm note */}
        {showConfirm && !isAnnual && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 16px', marginBottom: 14, fontSize: '0.85rem', color: '#0c4a6e' }}>
            Your plan will update to <strong>{newCount} students</strong> effective next billing cycle.
          </div>
        )}

        {updateError && (
          <p style={{ fontSize: '0.83rem', color: '#dc2626', marginBottom: 12 }}>{updateError}</p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {!showConfirm ? (
            <button
              onClick={handleDryRun}
              disabled={updating || !countChanged}
              style={{
                background: countChanged ? '#3b82f6' : '#e5e7eb',
                color: countChanged ? '#fff' : '#9ca3af',
                fontWeight: 600,
                fontSize: '0.9rem',
                padding: '9px 20px',
                borderRadius: 8,
                border: 'none',
                cursor: countChanged ? 'pointer' : 'not-allowed',
              }}
            >
              {updating ? 'Checking…' : isAnnual ? 'Preview change' : 'Update plan'}
            </button>
          ) : (
            <>
              <button
                onClick={handleConfirmUpdate}
                disabled={updating}
                style={{ background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: '0.9rem', padding: '9px 20px', borderRadius: 8, border: 'none', cursor: updating ? 'not-allowed' : 'pointer' }}
              >
                {updating ? 'Updating…' : 'Confirm update'}
              </button>
              <button
                onClick={() => { setShowConfirm(false); setProrationPreview(null) }}
                style={{ background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.9rem', padding: '9px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stripe portal */}
      <div style={card}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Payment & invoices
        </p>
        <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: 14, lineHeight: 1.6 }}>
          Update your payment method, download invoices, or cancel your subscription via the Stripe billing portal.
        </p>
        <button
          onClick={handleOpenPortal}
          disabled={portalLoading}
          style={{ background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.9rem', padding: '9px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: portalLoading ? 'not-allowed' : 'pointer' }}
        >
          {portalLoading ? 'Opening…' : 'Manage billing →'}
        </button>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
        Questions? <a href="mailto:help@lifelaunchr.com" style={{ color: '#9ca3af' }}>help@lifelaunchr.com</a>
      </p>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0c1b33' }}>{value}</p>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 640,
  margin: '0 auto',
  padding: '32px 16px 64px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const h1: React.CSSProperties = {
  fontSize: '1.3rem',
  fontWeight: 800,
  color: '#0c1b33',
  marginBottom: 20,
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '20px 24px',
  marginBottom: 16,
}
