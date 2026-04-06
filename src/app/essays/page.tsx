'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
}

interface Assignment {
  id?: number | string
  title?: string
  status?: string
  updated_at?: string
  [key: string]: unknown
}

// ── Helpers ────────────────────────────────────────────────────────────────

function lengthLabel(g: EssayGroup | EssayPrompt): string {
  if (g.display_length) return g.display_length
  if (g.max_length_value) return `${g.max_length_value} ${g.max_length_unit || 'words'}`
  return ''
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
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
      {/* Header */}
      <div
        onClick={() => multiplePrompts && setOpen(o => !o)}
        style={{
          padding: '12px 16px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          cursor: multiplePrompts ? 'pointer' : 'default',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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

          {/* Single prompt — show inline */}
          {!multiplePrompts && group.prompts[0] && (
            <p style={{ fontSize: '0.82rem', color: '#374151', margin: '6px 0 0', lineHeight: 1.5 }}>
              {stripHtml(group.prompts[0].prompt)}
            </p>
          )}

          {/* Instructions */}
          {group.instructions && (
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '4px 0 0', lineHeight: 1.4, fontStyle: 'italic' }}>
              {stripHtml(group.instructions)}
            </p>
          )}
        </div>

        {multiplePrompts && (
          <span style={{ color: '#9ca3af', fontSize: '0.8rem', flexShrink: 0, marginTop: 2 }}>
            {open ? '▲' : '▼'}
          </span>
        )}
      </div>

      {/* Expanded prompts */}
      {multiplePrompts && open && (
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '4px 0' }}>
          {group.prompts.map((p, i) => (
            <div key={p.slug} style={{
              padding: '10px 16px',
              borderBottom: i < group.prompts.length - 1 ? '1px solid #f9fafb' : 'none',
            }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af',
                  minWidth: 20, marginTop: 1,
                }}>{i + 1}.</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                    {stripHtml(p.prompt)}
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
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function EssaysPage() {
  const { getToken } = useAuth()
  const { user: clerkUser } = useUser()

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://lifelaunchr.onrender.com'

  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [accountType, setAccountType] = useState<string>('')
  const [essaysModule, setEssaysModule] = useState(false)
  const [editateAvailable, setEditateAvailable] = useState(false)

  const [prompts, setPrompts] = useState<PromptsResponse | null>(null)
  const [promptsLoading, setPromptsLoading] = useState(false)

  const [editateUrl, setEditateUrl] = useState<string | null>(null)
  const [editateLinkLoading, setEditateLinkLoading] = useState(false)
  const [editateLinkError, setEditateLinkError] = useState<string | null>(null)

  const [drafts, setDrafts] = useState<Assignment[]>([])
  const [draftsLoading, setDraftsLoading] = useState(false)

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
    const loadPrompts = async () => {
      setPromptsLoading(true)
      try {
        const token = await getToken()
        const res = await fetch(`${apiUrl}/essays/prompts`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) setPrompts(await res.json())
      } catch { /* ignore */ }
      finally { setPromptsLoading(false) }
    }
    loadPrompts()
  }, [essaysModule, getToken, apiUrl])

  // Load drafts for students with editate access
  useEffect(() => {
    if (!editateAvailable || accountType !== 'student') return
    const loadDrafts = async () => {
      setDraftsLoading(true)
      try {
        const token = await getToken()
        const res = await fetch(`${apiUrl}/essays/drafts`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setDrafts(data.assignments || [])
        }
      } catch { /* ignore */ }
      finally { setDraftsLoading(false) }
    }
    loadDrafts()
  }, [editateAvailable, accountType, getToken, apiUrl])

  const fetchEditateLink = useCallback(async () => {
    setEditateLinkLoading(true)
    setEditateLinkError(null)
    setEditateUrl(null)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/essays/link`, {
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
  }, [getToken, apiUrl])

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
          {isCounselor && ' Select a student to view their essay requirements.'}
        </p>

        {/* ── Editate access button (students only, editate_available) ── */}
        {isStudent && editateAvailable && (
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '20px 24px', marginBottom: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#111827', marginBottom: 4 }}>
                Submit & Review Essays with Editate
              </div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                Upload your drafts, get feedback from your coach, and track revisions — all in one place.
              </div>
            </div>
            <div>
              {editateUrl ? (
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
                  {editateLinkLoading ? 'Generating link…' : 'Access Editate'}
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

        {/* ── Drafts (students with editate access) ── */}
        {isStudent && editateAvailable && (
          <div style={{ marginBottom: 28 }}>
            <div style={sectionHeaderSt}>Your submitted drafts</div>
            {draftsLoading ? (
              <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Loading drafts…</p>
            ) : drafts.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>No drafts submitted yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {drafts.map((a, i) => (
                  <div key={a.id ?? i} style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                    padding: '10px 16px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                        {String(a.title || a.name || `Draft ${i + 1}`)}
                      </div>
                      {a.status && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                          {String(a.status)}
                        </div>
                      )}
                    </div>
                    {a.updated_at && (
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(String(a.updated_at)).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
