'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'

// ── Types ──────────────────────────────────────────────────────────────────

interface EssayPrompt {
  id: number
  slug: string
  sort_order: number
  prompt: string
  topic: string | null
  min_length_value: number | null
  min_length_unit: string | null
  max_length_value: number | null
  max_length_unit: string | null
  display_length: string
}

interface EssayGroup {
  slug: string
  name: string
  applications: string[]
  last_updated: number | null
  number_of_prompts_to_choose: number
  optional: boolean
  recommended: boolean
  instructions: string
  topic: string | null
  display_length: string
  min_length_value: number | null
  min_length_unit: string | null
  max_length_value: number | null
  max_length_unit: string | null
  prompts: EssayPrompt[]
  program_name?: string
  program_url?: string
}

interface SchoolEssays {
  iped: string
  name: string
  supplements: EssayGroup[]
  program_supplements: EssayGroup[]
}

interface PromptsResponse {
  platform_essays: EssayGroup[]
  schools: SchoolEssays[]
  student_editate_available?: boolean
  student_review_limit?: number
}

interface Assignment {
  id?: number | string
  name?: string
  source_assignment_name?: string | null
  total_assignment_submissions?: number
  marked_complete?: boolean
  next_due_date?: string | null
  [key: string]: unknown
}

// ── Helpers ────────────────────────────────────────────────────────────────

function lengthLabel(g: EssayGroup | EssayPrompt): string {
  if (g.display_length) return g.display_length
  if (g.max_length_value) return `${g.max_length_value} ${g.max_length_unit || 'words'}`
  return ''
}

function cleanText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Sub-components ─────────────────────────────────────────────────────────

function EssayGroupCard({ group }: { group: EssayGroup }) {
  const [open, setOpen] = useState(false)
  const chooseLabel =
    group.number_of_prompts_to_choose === 1
      ? 'Choose 1'
      : `Choose ${group.number_of_prompts_to_choose}`
  const multiplePrompts = group.prompts.length > 1

  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 10,
      background: '#fff', overflow: 'hidden',
    }}>
      {/* Header — always clickable */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', gap: 12, userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          {group.name && (
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
              {group.name}
            </span>
          )}
          {group.optional && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 600, color: '#6366f1',
              background: '#eef2ff', borderRadius: 4, padding: '1px 6px',
            }}>Optional</span>
          )}
          {lengthLabel(group) && (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{lengthLabel(group)}</span>
          )}
          {multiplePrompts && (
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>· {chooseLabel}</span>
          )}
        </div>
        <span style={{ color: '#9ca3af', fontSize: '0.8rem', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded content */}
      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6' }}>
          {multiplePrompts ? (
            <div style={{ padding: '4px 0' }}>
              {group.prompts.map((p, i) => (
                <div key={p.slug} style={{
                  padding: '10px 16px',
                  borderBottom: i < group.prompts.length - 1 ? '1px solid #f9fafb' : 'none',
                }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af',
                      minWidth: 20, marginTop: 1, flexShrink: 0,
                    }}>{i + 1}.</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                        {cleanText(p.prompt)}
                      </p>
                      {lengthLabel(p) && (
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 4, display: 'block' }}>
                          {lengthLabel(p)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : group.prompts[0] ? (
            <div style={{ padding: '12px 16px' }}>
              <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0, lineHeight: 1.6 }}>
                {cleanText(group.prompts[0].prompt)}
              </p>
              {lengthLabel(group.prompts[0]) && lengthLabel(group.prompts[0]) !== lengthLabel(group) && (
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 4, display: 'block' }}>
                  {lengthLabel(group.prompts[0])}
                </span>
              )}
            </div>
          ) : null}
          {group.instructions && (
            <div style={{ padding: '8px 16px 12px', borderTop: group.prompts.length > 0 ? '1px solid #f9fafb' : 'none' }}>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>
                {cleanText(group.instructions)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

function EssaysPageInner() {
  const { getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const searchParams = useSearchParams()
  const forStudentId = searchParams.get('for') ? parseInt(searchParams.get('for')!, 10) : null

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://lifelaunchr.onrender.com'

  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [accountType, setAccountType] = useState<string>('')
  const [essaysModule, setEssaysModule] = useState(false)
  const [editateAvailable, setEditateAvailable] = useState(false)       // student's own editate status (from /my-usage)
  const [studentEditateAvailable, setStudentEditateAvailable] = useState(false) // counselor view: target student's status (from prompts)
  const [studentReviewLimitForCounselor, setStudentReviewLimitForCounselor] = useState(0)

  const [prompts, setPrompts] = useState<PromptsResponse | null>(null)
  const [promptsLoading, setPromptsLoading] = useState(false)

  const [editateUrl, setEditateUrl] = useState<string | null>(null)
  const [editateLinkLoading, setEditateLinkLoading] = useState(false)
  const [editateLinkError, setEditateLinkError] = useState<string | null>(null)

  const [drafts, setDrafts] = useState<Assignment[]>([])
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [roundsUsed, setRoundsUsed] = useState(0)
  const [reviewLimit, setReviewLimit] = useState(0)

  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Load usage + modules on mount
  useEffect(() => {
    if (!clerkUser) return
    const init = async () => {
      try {
        const token = await getToken()
        if (!token) { setAccessDenied(true); setLoading(false); return }
        const res = await fetch(`${apiUrl}/my-usage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) { setAccessDenied(true); setLoading(false); return }
        const data = await res.json()
        const type = data.account_type || 'student'
        setAccountType(type)
        setEssaysModule(Boolean(data.essays_module))
        setEditateAvailable(Boolean(data.editate_available))
        if (!data.essays_module) { setAccessDenied(true) }
      } catch { setAccessDenied(true) }
      finally { setLoading(false) }
    }
    init()
  }, [clerkUser, getToken, apiUrl])

  // Load essay prompts once we know the module is enabled
  useEffect(() => {
    if (!essaysModule) return
    if (accountType === 'counselor' && !forStudentId) return
    const loadPrompts = async () => {
      setPromptsLoading(true)
      try {
        const token = await getToken()
        const url = forStudentId
          ? `${apiUrl}/essays/prompts?student_id=${forStudentId}`
          : `${apiUrl}/essays/prompts`
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setPrompts(data)
          // For counselor view, store the student's Editate status in dedicated state
          // (never use setEditateAvailable here — init effect overwrites it on re-render)
          if (forStudentId && data.student_editate_available != null) {
            setStudentEditateAvailable(Boolean(data.student_editate_available))
            setStudentReviewLimitForCounselor(data.student_review_limit ?? 0)
          }
        }
      } catch { /* ignore */ }
      finally { setPromptsLoading(false) }
    }
    loadPrompts()
  }, [essaysModule, accountType, forStudentId, getToken, apiUrl])

  // Load drafts for students with editate access, or counselors viewing a student
  useEffect(() => {
    const isViewingStudentAs = (accountType === 'counselor' || accountType === 'parent') && forStudentId
    const avail = isViewingStudentAs ? studentEditateAvailable : editateAvailable
    if (!avail) return
    if (accountType !== 'student' && !isViewingStudentAs) return
    const loadDrafts = async () => {
      setDraftsLoading(true)
      try {
        const token = await getToken()
        const draftsUrl = isViewingStudentAs
          ? `${apiUrl}/essays/drafts?student_id=${forStudentId}`
          : `${apiUrl}/essays/drafts`
        const res = await fetch(draftsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setDrafts(data.assignments || [])
          setRoundsUsed(data.rounds_used ?? 0)
          setReviewLimit(data.review_limit ?? 0)
        }
      } catch { /* ignore */ }
      finally { setDraftsLoading(false) }
    }
    loadDrafts()
  }, [editateAvailable, studentEditateAvailable, accountType, forStudentId, getToken, apiUrl])

  const fetchEditateLink = useCallback(async () => {
    setEditateLinkLoading(true)
    setEditateLinkError(null)
    setEditateUrl(null)
    try {
      const token = await getToken()
      const url = (isCounselor && forStudentId)
        ? `${apiUrl}/essays/link?student_id=${forStudentId}`
        : `${apiUrl}/essays/link`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setEditateLinkError(err.detail || 'Could not generate link. Please try again.')
        return
      }
      const data = await res.json()
      setEditateUrl(data.url)
    } catch {
      setEditateLinkError('Network error. Please try again.')
    } finally {
      setEditateLinkLoading(false)
    }
  }, [getToken, apiUrl, accountType, forStudentId])

  // ── Styles ────────────────────────────────────────────────────────────────

  const headerSt: React.CSSProperties = {
    background: '#0c1b33', color: '#fff', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', height: 49, flexShrink: 0,
  }

  const sectionHeaderSt: React.CSSProperties = {
    fontSize: '0.78rem', fontWeight: 700, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    margin: '24px 0 10px',
  }

  // ── Render guards ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading…</div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
        <header style={headerSt}>
          <Link href="/" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
            <span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr
          </Link>
          <Link href="/chat" style={{ fontSize: '0.82rem', color: '#8888aa', textDecoration: 'none', border: '1px solid #444466', padding: '4px 12px', borderRadius: 6 }}>
            ← Back to Soar
          </Link>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 380 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔒</div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>Essays Not Available</h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>The essays module is not enabled for your account.</p>
            <Link href="/chat" style={{ display: 'inline-block', marginTop: 20, background: '#4f46e5', color: '#fff', padding: '8px 20px', borderRadius: 8, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
              Back to Soar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isStudent = accountType === 'student'
  const isParent = accountType === 'parent'
  const isCounselor = accountType === 'counselor'

  // For counselor/parent-viewing-student, use the dedicated student state (immune to init re-runs).
  // For students, use their own editate status from /my-usage.
  const viewingStudentAs = (isCounselor || isParent) && forStudentId
  const effectiveEditateAvailable = viewingStudentAs ? studentEditateAvailable : editateAvailable
  const effectiveReviewLimit = viewingStudentAs ? studentReviewLimitForCounselor : reviewLimit

  const noPrompts =
    !promptsLoading &&
    prompts &&
    prompts.platform_essays.length === 0 &&
    prompts.schools.length === 0

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={headerSt}>
        <Link href="/" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
          <span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr
        </Link>
        <Link href="/chat" style={{ fontSize: '0.82rem', color: '#8888aa', textDecoration: 'none', border: '1px solid #444466', padding: '4px 12px', borderRadius: 6 }}>
          ← Back to Soar
        </Link>
      </header>

      {/* Content */}
      <main style={{ flex: 1, maxWidth: 800, width: '100%', margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0c1b33', marginBottom: 4 }}>Essays</h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 24 }}>
          Essay prompts for your college list.
          {isCounselor && !forStudentId && ' Select a student from the sidebar to view their essay requirements.'}
        </p>

        {/* ── Editate access panel (students + counselors viewing a student with editate; not parents) ── */}
        {effectiveEditateAvailable && (isStudent || (isCounselor && forStudentId)) && (
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '20px 24px', marginBottom: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#111827', marginBottom: 4 }}>
                {isCounselor ? "Student's Editate Access" : 'Submit & Review Essays with Editate'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                {isCounselor
                  ? 'Generate a login link for this student to access Editate.'
                  : 'Upload your drafts, get feedback from your coach, and track revisions — all in one place.'}
              </div>
            </div>
            <div>
              {editateUrl ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {!isCounselor && (
                    <a
                      href={editateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#4f46e5', color: '#fff', borderRadius: 8,
                        padding: '8px 18px', fontWeight: 600, fontSize: '0.875rem',
                        textDecoration: 'none', display: 'inline-block',
                      }}
                    >
                      Open Editate →
                    </a>
                  )}
                  {isCounselor && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(editateUrl)
                        setLinkCopied(true)
                        setTimeout(() => setLinkCopied(false), 2000)
                      }}
                      style={{
                        background: linkCopied ? '#d1fae5' : '#f3f4f6',
                        color: linkCopied ? '#065f46' : '#374151',
                        border: 'none', borderRadius: 8,
                        padding: '8px 18px', fontWeight: 600, fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      {linkCopied ? 'Copied!' : 'Copy link'}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={fetchEditateLink}
                  disabled={editateLinkLoading}
                  style={{
                    background: editateLinkLoading ? '#c7d2fe' : '#4f46e5',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px 18px', fontWeight: 600, fontSize: '0.875rem',
                    cursor: editateLinkLoading ? 'default' : 'pointer',
                  }}
                >
                  {editateLinkLoading ? 'Generating link…' : isCounselor ? 'Generate Student Link' : 'Access Editate'}
                </button>
              )}
              {editateLinkError && (
                <p style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 6 }}>{editateLinkError}</p>
              )}
              {editateUrl && (
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>
                  Link expires in ~48 hours.{' '}
                  <button
                    onClick={fetchEditateLink}
                    style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', padding: 0, fontSize: '0.75rem', textDecoration: 'underline' }}
                  >
                    Refresh
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Feedback rounds bar (students, counselors, or parents viewing a student with editate) ── */}
        {effectiveEditateAvailable && effectiveReviewLimit > 0 && (isStudent || viewingStudentAs) && (
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '16px 20px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                Detailed Feedback Rounds: {roundsUsed} used of {effectiveReviewLimit}
              </span>
              {(isStudent || isParent) && (
                <button
                  onClick={() => setReviewModalOpen(true)}
                  style={{
                    background: 'none', border: 'none', color: '#6366f1',
                    fontSize: '0.75rem', cursor: 'pointer', padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  What does this mean?
                </button>
              )}
            </div>
            {/* Progress bar */}
            <div style={{ height: 6, borderRadius: 9999, background: '#f3f4f6', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, effectiveReviewLimit > 0 ? (roundsUsed / effectiveReviewLimit) * 100 : 0)}%`,
                background: roundsUsed >= effectiveReviewLimit ? '#ef4444' : roundsUsed / effectiveReviewLimit >= 0.75 ? '#f59e0b' : '#4f46e5',
                borderRadius: 9999,
                transition: 'width 0.3s ease',
              }} />
            </div>
            {/* Warning */}
            {roundsUsed >= effectiveReviewLimit && (
              <p style={{
                fontSize: '0.78rem', marginTop: 8,
                color: '#dc2626',
              }}>
                You&apos;ve used all your included feedback rounds. Additional reviews are available — contact your coach.
              </p>
            )}
          </div>
        )}

        {/* ── "What does this mean?" modal ── */}
        {reviewModalOpen && (
          <div
            onClick={() => setReviewModalOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 14, maxWidth: 500, width: '100%',
                padding: '28px 28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 16, marginTop: 0 }}>
                About Essay Feedback Rounds
              </h2>
              <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: 0 }}>
                  <strong>When do reviews happen?</strong> Feedback rounds typically take place after your brainstorming and initial drafting sessions with your coach — once you have a working draft ready for in-depth critique.
                </p>
                <p style={{ margin: 0 }}>
                  <strong>What&apos;s included?</strong> Each round of feedback includes written comments on what&apos;s working well, specific suggestions for improvement, goals for your next draft, and in-line markup directly on your essay.
                </p>
                <p style={{ margin: 0 }}>
                  <strong>How long does it take?</strong> You&apos;ll typically receive feedback within 48–72 hours of submission. Plan ahead — aim to submit at least 2 weeks before any application deadline.
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Need more rounds?</strong> Additional feedback rounds are available at $55 each, or you can purchase a bundle of 12 for $600. Reach out to your coach to add more.
                </p>
              </div>
              <div style={{ marginTop: 20, textAlign: 'right' }}>
                <button
                  onClick={() => setReviewModalOpen(false)}
                  style={{
                    background: '#4f46e5', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '8px 20px', fontWeight: 600,
                    fontSize: '0.875rem', cursor: 'pointer',
                  }}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Drafts (students with editate access, or counselors/parents viewing a student) ── */}
        {effectiveEditateAvailable && (isStudent || viewingStudentAs) && (
          <div style={{ marginBottom: 28 }}>
            <div style={sectionHeaderSt}>{isCounselor || isParent ? "Student's submitted drafts" : "Your submitted drafts"}</div>
            {draftsLoading ? (
              <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Loading drafts…</p>
            ) : (() => {
              const activeDrafts = drafts.filter(a =>
                (a.total_assignment_submissions ?? 0) > 0 || a.marked_complete
              )
              return activeDrafts.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>No drafts submitted yet.</p>
              ) : (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Table header */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 120px',
                    padding: '8px 16px', background: '#f9fafb',
                    borderBottom: '1px solid #e2e8f0',
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Essay</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Submissions</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Status</span>
                  </div>
                  {activeDrafts.map((a, i) => {
                    const displayName = a.source_assignment_name || a.name || `Draft ${i + 1}`
                    const subs = a.total_assignment_submissions ?? 0
                    const complete = a.marked_complete
                    return (
                      <div key={String(a.id ?? i)} style={{
                        display: 'grid', gridTemplateColumns: '1fr 100px 120px',
                        padding: '10px 16px', alignItems: 'center',
                        borderBottom: i < activeDrafts.length - 1 ? '1px solid #f3f4f6' : 'none',
                      }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                          {String(displayName)}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#6b7280', textAlign: 'center' }}>
                          {subs}
                        </span>
                        <div style={{ textAlign: 'center' }}>
                          {complete ? (
                            <span style={{
                              fontSize: '0.72rem', fontWeight: 600, color: '#065f46',
                              background: '#d1fae5', borderRadius: 4, padding: '2px 8px',
                            }}>Complete</span>
                          ) : (
                            <span style={{
                              fontSize: '0.72rem', fontWeight: 600, color: '#92400e',
                              background: '#fef3c7', borderRadius: 4, padding: '2px 8px',
                            }}>In Progress</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── Essay prompts ── */}
        {promptsLoading && (
          <p style={{ fontSize: '0.82rem', color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>
            Loading essay prompts…
          </p>
        )}

        {noPrompts && (
          <div style={{
            textAlign: 'center', color: '#9ca3af', padding: '48px 0',
            background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>✏️</div>
            <p style={{ fontSize: '0.875rem' }}>
              {isCounselor
                ? 'No essay data cached yet. Use the admin panel to refresh schools from Editate.'
                : 'No essay prompts found for your college list yet.'}
            </p>
          </div>
        )}

        {prompts && !promptsLoading && (
          <>
            {/* Platform essays (Common App, Coalition, etc.) */}
            {prompts.platform_essays.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={sectionHeaderSt}>Application platform essays</div>
                {prompts.platform_essays.map(g => (
                  <EssayGroupCard key={g.slug} group={g} />
                ))}
              </div>
            )}

            {/* Per-school supplements */}
            {prompts.schools.map(school => (
              (school.supplements.length > 0 || school.program_supplements.length > 0) && (
                <div key={school.iped} style={{ marginBottom: 32 }}>
                  <div style={sectionHeaderSt}>{school.name}</div>

                  {school.supplements.map(g => (
                    <EssayGroupCard key={g.slug} group={g} />
                  ))}

                  {school.program_supplements.length > 0 && (
                    <>
                      <div style={{
                        fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        margin: '14px 0 8px',
                      }}>
                        Program-specific
                      </div>
                      {school.program_supplements.map(g => (
                        <div key={g.slug}>
                          {g.program_name && (
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6366f1', marginBottom: 4 }}>
                              {g.program_url
                                ? <a href={g.program_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>{g.program_name} ↗</a>
                                : g.program_name}
                            </div>
                          )}
                          <EssayGroupCard group={g} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )
            ))}
          </>
        )}
      </main>
    </div>
  )
}

export default function EssaysPage() {
  return (
    <Suspense>
      <EssaysPageInner />
    </Suspense>
  )
}
