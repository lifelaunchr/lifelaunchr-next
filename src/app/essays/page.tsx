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
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl mb-2 overflow-hidden">
      {/* Header — always clickable */}
      <div
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {group.name && (
            <span className="text-sm font-semibold text-white">{group.name}</span>
          )}
          {group.optional && (
            <span className="text-[10px] font-semibold text-violet-400 bg-violet-900/30 border border-violet-700/40 rounded px-1.5 py-0.5">
              Optional
            </span>
          )}
          {lengthLabel(group) && (
            <span className="text-xs text-slate-500">{lengthLabel(group)}</span>
          )}
          {multiplePrompts && (
            <span className="text-xs text-slate-500">· {chooseLabel}</span>
          )}
        </div>
        <span className="text-slate-500 text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-slate-700/50">
          {multiplePrompts ? (
            <div>
              {group.prompts.map((p, i) => (
                <div
                  key={p.slug}
                  className={`px-4 py-3 ${i < group.prompts.length - 1 ? 'border-b border-slate-700/30' : ''}`}
                >
                  <div className="flex gap-3">
                    <span className="text-xs font-bold text-slate-500 min-w-[20px] mt-0.5 flex-shrink-0">
                      {i + 1}.
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-300 leading-relaxed">{cleanText(p.prompt)}</p>
                      {lengthLabel(p) && (
                        <span className="text-xs text-slate-500 mt-1 block">{lengthLabel(p)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : group.prompts[0] ? (
            <div className="px-4 py-3">
              <p className="text-sm text-slate-300 leading-relaxed">{cleanText(group.prompts[0].prompt)}</p>
              {lengthLabel(group.prompts[0]) && lengthLabel(group.prompts[0]) !== lengthLabel(group) && (
                <span className="text-xs text-slate-500 mt-1 block">{lengthLabel(group.prompts[0])}</span>
              )}
            </div>
          ) : null}
          {group.instructions && (
            <div className={`px-4 pb-3 ${group.prompts.length > 0 ? 'border-t border-slate-700/30 pt-2' : ''}`}>
              <p className="text-xs text-slate-500 leading-relaxed italic">{cleanText(group.instructions)}</p>
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
  const [editateAvailable, setEditateAvailable] = useState(false)
  const [studentEditateAvailable, setStudentEditateAvailable] = useState(false)
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
          if (forStudentId) {
            // Only show "not authorized" if the backend explicitly returns false.
            // If the field is absent/null we default to true so the empty-state
            // shows "no applying colleges" instead of the misleading auth warning.
            setStudentEditateAvailable(
              data.student_editate_available != null
                ? Boolean(data.student_editate_available)
                : true
            )
            setStudentReviewLimitForCounselor(data.student_review_limit ?? 0)
          }
        } else {
          // Non-ok response — render the empty state rather than a blank page.
          // Default studentEditateAvailable to true so we don't show "not authorized"
          // just because the API errored.
          setPrompts({ platform_essays: [], schools: [] })
          if (forStudentId) setStudentEditateAvailable(true)
        }
      } catch {
        // Network/parse error — same fallbacks
        setPrompts({ platform_essays: [], schools: [] })
        if (forStudentId) setStudentEditateAvailable(true)
      }
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
        const res = await fetch(draftsUrl, { headers: { Authorization: `Bearer ${token}` } })
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

  const isCounselor = accountType === 'counselor'

  const fetchEditateLink = useCallback(async () => {
    setEditateLinkLoading(true)
    setEditateLinkError(null)
    setEditateUrl(null)
    try {
      const token = await getToken()
      const url = (isCounselor && forStudentId)
        ? `${apiUrl}/essays/link?student_id=${forStudentId}`
        : `${apiUrl}/essays/link`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
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
  }, [getToken, apiUrl, accountType, forStudentId, isCounselor])

  // ── Render guards ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <header className="bg-slate-900 border-b border-slate-800 px-4 h-12 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold text-white">✍️ Essays</span>
          <Link href="/chat" className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
            ← Back to Soar
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm px-4">
            <div className="text-4xl mb-3">🔒</div>
            <h1 className="text-lg font-bold text-white mb-2">Essays Not Available</h1>
            <p className="text-sm text-slate-400">The essays module is not enabled for your account.</p>
            <Link href="/chat" className="inline-block mt-5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              Back to Soar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Counselor landed here without a student selected (e.g. direct URL)
  if (accountType === 'counselor' && !forStudentId) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <header className="bg-slate-900 border-b border-slate-800 px-4 h-12 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold text-white">✍️ Essays</span>
          <Link href="/chat" className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
            ← Back to Soar
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm px-4">
            <div className="text-4xl mb-3">✏️</div>
            <h1 className="text-lg font-bold text-white mb-2">Select a Student</h1>
            <p className="text-sm text-slate-400">Choose a student from the sidebar to view their essay requirements.</p>
            <Link href="/chat" className="inline-block mt-5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              Back to Soar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isStudent = accountType === 'student'
  const isParent = accountType === 'parent'

  const viewingStudentAs = (isCounselor || isParent) && forStudentId
  const effectiveEditateAvailable = viewingStudentAs ? studentEditateAvailable : editateAvailable
  const effectiveReviewLimit = viewingStudentAs ? studentReviewLimitForCounselor : reviewLimit

  const noPrompts =
    !promptsLoading &&
    prompts &&
    prompts.platform_essays.length === 0 &&
    prompts.schools.length === 0

  const backHref = forStudentId ? `/writing?for=${forStudentId}` : '/writing'

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href={backHref} className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Writing
        </Link>
        <span className="text-slate-700">|</span>
        <h1 className="text-base font-semibold">Essay Prompts &amp; Drafts</h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

          {/* ── Editate access panel ── */}
          {effectiveEditateAvailable && (isStudent || (isCounselor && forStudentId)) && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white mb-1">
                  {isCounselor ? "Student's Editate Access" : 'Submit & Review Essays with Editate'}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isCounselor
                    ? 'Generate a login link for this student to access Editate.'
                    : 'Upload your drafts, get feedback from your coach, and track revisions — all in one place.'}
                </p>
              </div>
              <div className="flex-shrink-0">
                {editateUrl ? (
                  <div className="flex gap-2 flex-wrap items-center">
                    {!isCounselor && (
                      <a
                        href={editateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
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
                        className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                          linkCopied
                            ? 'bg-green-900/30 text-green-400 border border-green-700/40'
                            : 'bg-slate-700 hover:bg-slate-600 text-white'
                        }`}
                      >
                        {linkCopied ? 'Copied! ✓' : 'Copy link'}
                      </button>
                    )}
                    <button
                      onClick={fetchEditateLink}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={fetchEditateLink}
                    disabled={editateLinkLoading}
                    className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    {editateLinkLoading ? 'Generating…' : isCounselor ? 'Generate Student Link' : 'Access Editate'}
                  </button>
                )}
                {editateLinkError && (
                  <p className="text-xs text-red-400 mt-1.5">{editateLinkError}</p>
                )}
                {editateUrl && (
                  <p className="text-xs text-slate-600 mt-1.5">Link expires in ~48 hours.</p>
                )}
              </div>
            </div>
          )}

          {/* ── Feedback rounds bar ── */}
          {effectiveEditateAvailable && effectiveReviewLimit > 0 && (isStudent || viewingStudentAs) && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">
                  Detailed Feedback Rounds: {roundsUsed} used of {effectiveReviewLimit}
                </span>
                {(isStudent || isParent) && (
                  <button
                    onClick={() => setReviewModalOpen(true)}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    What is this?
                  </button>
                )}
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, effectiveReviewLimit > 0 ? (roundsUsed / effectiveReviewLimit) * 100 : 0)}%`,
                    background: roundsUsed >= effectiveReviewLimit ? '#f87171' : roundsUsed / effectiveReviewLimit >= 0.75 ? '#fbbf24' : '#7c3aed',
                  }}
                />
              </div>
              {roundsUsed >= effectiveReviewLimit && (
                <p className="text-xs text-red-400">
                  You&apos;ve used all your included feedback rounds. Additional reviews are available — contact your coach.
                </p>
              )}
            </div>
          )}

          {/* ── "What does this mean?" modal ── */}
          {reviewModalOpen && (
            <div
              onClick={() => setReviewModalOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-5"
              style={{ background: 'rgba(4,8,20,0.78)', backdropFilter: 'blur(4px)' }}
            >
              <div
                onClick={e => e.stopPropagation()}
                className="bg-[#0c1b33] border border-slate-700/60 rounded-2xl max-w-lg w-full p-7 shadow-2xl"
              >
                <h2 className="text-base font-bold text-white mb-4">About Essay Feedback Rounds</h2>
                <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                  <p>
                    <span className="font-semibold text-white">When do reviews happen?</span>{' '}
                    Feedback rounds typically take place after your brainstorming and initial drafting sessions with your coach — once you have a working draft ready for in-depth critique.
                  </p>
                  <p>
                    <span className="font-semibold text-white">What&apos;s included?</span>{' '}
                    Each round of feedback includes written comments on what&apos;s working well, specific suggestions for improvement, goals for your next draft, and in-line markup directly on your essay.
                  </p>
                  <p>
                    <span className="font-semibold text-white">How long does it take?</span>{' '}
                    You&apos;ll typically receive feedback within 48–72 hours of submission. Plan ahead — aim to submit at least 2 weeks before any application deadline.
                  </p>
                  <p>
                    <span className="font-semibold text-white">Need more rounds?</span>{' '}
                    Additional feedback rounds are available at $55 each, or you can purchase a bundle of 12 for $600. Reach out to your coach to add more.
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setReviewModalOpen(false)}
                    className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Drafts ── */}
          {effectiveEditateAvailable && (isStudent || viewingStudentAs) && (
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500 font-medium mb-3">
                {isCounselor || isParent ? "Student's submitted drafts" : 'Your submitted drafts'}
              </p>
              {draftsLoading ? (
                <p className="text-sm text-slate-500">Loading drafts…</p>
              ) : (() => {
                const activeDrafts = drafts.filter(a =>
                  (a.total_assignment_submissions ?? 0) > 0 || a.marked_complete
                )
                return activeDrafts.length === 0 ? (
                  <p className="text-sm text-slate-500">No drafts submitted yet.</p>
                ) : (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_100px_120px] px-4 py-2.5 bg-slate-700/30 border-b border-slate-700/50">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Essay</span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest text-center">Submissions</span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest text-center">Status</span>
                    </div>
                    {activeDrafts.map((a, i) => {
                      const displayName = a.source_assignment_name || a.name || `Draft ${i + 1}`
                      const subs = a.total_assignment_submissions ?? 0
                      const complete = a.marked_complete
                      return (
                        <div
                          key={String(a.id ?? i)}
                          className={`grid grid-cols-[1fr_100px_120px] px-4 py-3 items-center ${
                            i < activeDrafts.length - 1 ? 'border-b border-slate-700/30' : ''
                          }`}
                        >
                          <span className="text-sm font-medium text-white">{String(displayName)}</span>
                          <span className="text-sm text-slate-400 text-center">{subs}</span>
                          <div className="text-center">
                            {complete ? (
                              <span className="text-[10px] font-semibold text-green-400 bg-green-900/20 border border-green-700/30 rounded px-2 py-0.5">
                                Complete
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded px-2 py-0.5">
                                In Progress
                              </span>
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
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {noPrompts && (
            <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/30">
              <div className="text-3xl mb-3">✏️</div>
              {!effectiveEditateAvailable ? (
                <p className="text-sm text-slate-400">
                  {viewingStudentAs
                    ? 'This student is not yet authorized to use Editate. Enable it in the admin panel under their user settings.'
                    : 'Essay review is not enabled for your account. Contact your counselor to get access.'}
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  No essay prompts yet.{' '}
                  {viewingStudentAs ? 'The student has' : 'You have'} no colleges in Applying or later status.{' '}
                  Move colleges from Researching to Applying on the{' '}
                  <Link href="/lists" className="text-violet-400 hover:text-violet-300 underline transition-colors">
                    Lists page
                  </Link>
                  {' '}to see prompts here.
                </p>
              )}
            </div>
          )}

          {prompts && !promptsLoading && (
            <div className="space-y-8">
              {/* Platform essays (Common App, Coalition, etc.) */}
              {prompts.platform_essays.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-medium mb-3">
                    Application platform essays
                  </p>
                  {prompts.platform_essays.map(g => (
                    <EssayGroupCard key={g.slug} group={g} />
                  ))}
                </div>
              )}

              {/* Per-school supplements */}
              {prompts.schools.map(school => (
                (school.supplements.length > 0 || school.program_supplements.length > 0) && (
                  <div key={school.iped}>
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-medium mb-3">
                      {school.name}
                    </p>

                    {school.supplements.map(g => (
                      <EssayGroupCard key={g.slug} group={g} />
                    ))}

                    {school.program_supplements.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-2">
                          Program-specific
                        </p>
                        {school.program_supplements.map(g => (
                          <div key={g.slug}>
                            {g.program_name && (
                              <div className="text-xs font-semibold text-violet-400 mb-1">
                                {g.program_url
                                  ? <a href={g.program_url} target="_blank" rel="noopener noreferrer" className="hover:text-violet-300 transition-colors">{g.program_name} ↗</a>
                                  : g.program_name}
                              </div>
                            )}
                            <EssayGroupCard group={g} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default function EssaysPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <EssaysPageInner />
    </Suspense>
  )
}
