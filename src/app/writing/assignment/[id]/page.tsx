'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://lifelaunchr.onrender.com'

const SECTION_BACK: Record<string, string> = {
  self_discovery: 'sd-2',
  writing_practice: 'practice',
  commonapp: 'commonapp',
  uc_piqs: 'uc_piqs',
  why_major: 'why_major',
  why_college: 'why_college',
}

interface Assignment {
  id: number
  student_id: number
  exercise_id: number
  status: 'assigned' | 'in_progress' | 'submitted' | 'reviewed' | 'complete'
  note_to_student: string | null
  coach_feedback: string | null
  due_date: string | null
  exercise_title: string
  prompt_text: string | null
  framing_content: string | null
  exercise_type: string
  word_limit: number | null
  time_limit_minutes: number | null
  is_timed: boolean
  response_schema: object | null
  unit_title: string
  section_key: string
  section_title: string
  responses: Response[]
}

interface Response {
  id: number
  content: string | null
  structured_data: object | null
  word_count: number | null
  revision_number: number
  submitted_at: string
  coach_notes: string | null
  coach_reviewed_at: string | null
}

interface StructuredField {
  id: string
  label: string
  type: 'textarea'
}

interface StructuredSchema {
  type: 'structured'
  fields: StructuredField[]
}

function AssignmentPageInner() {
  const { getToken, isLoaded } = useAuth()
  const params = useParams()
  const searchParams = useSearchParams()
  const assignmentId = params.id as string
  const forParam = searchParams.get('for')

  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [body, setBody] = useState('')
  // For structured exercises: per-field answers keyed by field id
  const [structuredBody, setStructuredBody] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'guide' | 'write' | 'history'>('guide')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    getToken().then(tok => { if (tok) setToken(tok) })
  }, [isLoaded, getToken])

  useEffect(() => {
    if (!token || !assignmentId) return
    fetch(`${API}/writing/assignments/${assignmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const a: Assignment = data.assignment
        setAssignment(a)
        // Pre-populate write tab with most recent response
        if (a.responses && a.responses.length > 0) {
          const latest = a.responses[0]
          if (a.exercise_type === 'structured' && latest.content) {
            // Parse JSON → populate per-field state
            try {
              setStructuredBody(JSON.parse(latest.content) as Record<string, string>)
            } catch {
              setStructuredBody({})
            }
          } else {
            setBody(latest.content || '')
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token, assignmentId])

  function wordCount(text: string) {
    return text.trim() ? text.trim().split(/\s+/).length : 0
  }

  // Mark a content/milestone exercise complete by posting a sentinel response
  async function handleComplete(sentinel: string) {
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/writing/assignments/${assignmentId}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: sentinel }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const sectionKey = assignment?.section_key ?? ''
      const backSection = SECTION_BACK[sectionKey] || ''
      const href = `/writing?section=${backSection}${forParam ? `&for=${forParam}` : ''}`
      router.push(href)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      setSaving(false)
    }
  }

  async function handleSave() {
    const isStructured = assignment?.exercise_type === 'structured'
    const hasContent = isStructured
      ? Object.values(structuredBody).some(v => v.trim())
      : body.trim()
    if (!token || !hasContent) return
    setSaving(true)
    setError(null)
    const content = isStructured ? JSON.stringify(structuredBody) : body
    try {
      const res = await fetch(`${API}/writing/assignments/${assignmentId}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { detail?: string }).detail || 'Save failed')
      }
      const data = await res.json()
      // Add new response to top of list
      const newResponse: Response = {
        id: data.response.id,
        content,
        structured_data: null,
        word_count: wordCount(body),
        revision_number: data.response.revision_number,
        submitted_at: data.response.submitted_at,
        coach_notes: null,
        coach_reviewed_at: null,
      }
      setAssignment(prev => prev ? { ...prev, responses: [newResponse, ...prev.responses] } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || !token || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Assignment not found.</div>
      </div>
    )
  }

  const responses = assignment.responses || []
  const isContent = assignment.exercise_type === 'content'
  const isMilestone = assignment.exercise_type === 'milestone'
  const isStructured = assignment.exercise_type === 'structured'
  // Word count: sum all structured fields, or count free-write body
  const wc = isStructured
    ? Object.values(structuredBody).reduce((sum, v) => sum + wordCount(v), 0)
    : wordCount(body)
  const withinLimit = !assignment.word_limit || wc <= assignment.word_limit
  const isAlreadyDone = responses.length > 0
  // Parse schema for structured exercises
  const schema: StructuredSchema | null = isStructured && assignment.response_schema
    ? (assignment.response_schema as StructuredSchema)
    : null
  const isComplete = assignment.status === 'complete'
  const isReviewed = assignment.status === 'reviewed' || isComplete
  const hasCoachFeedback = !!(assignment.coach_feedback?.trim())

  // Section back-link
  const backSection = SECTION_BACK[assignment.section_key] || ''
  const backHref = `/writing?section=${backSection}${forParam ? `&for=${forParam}` : ''}`

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href={backHref} className="text-slate-400 hover:text-white text-sm flex-shrink-0">
            ← {assignment.unit_title}
          </Link>
          <span className="text-slate-700">|</span>
          <h1 className="text-base font-semibold truncate">{assignment.exercise_title}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Status badge */}
        {(isReviewed || isComplete) && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-fit ${
            isComplete
              ? 'bg-slate-700/50 text-slate-400 border border-slate-700'
              : 'bg-green-900/20 text-green-400 border border-green-700/30'
          }`}>
            {isComplete ? '✓ Complete' : '✓ Reviewed by coach'}
          </div>
        )}

        {/* Coach note — shown before writing */}
        {assignment.note_to_student && (
          <div className="bg-violet-900/20 border border-violet-700/30 rounded-xl px-4 py-3">
            <p className="text-xs text-violet-300 font-medium mb-0.5">Note from your coach</p>
            <p className="text-sm text-slate-300 italic">{assignment.note_to_student}</p>
          </div>
        )}

        {/* Coach feedback — shown after review */}
        {hasCoachFeedback && (
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-4 py-4 space-y-1">
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">Coach feedback</p>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{assignment.coach_feedback}</p>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-slate-600">
          {assignment.word_limit && <span>Up to {assignment.word_limit} words</span>}
          {assignment.is_timed && assignment.time_limit_minutes && (
            <span>⏱ {assignment.time_limit_minutes} min timed write</span>
          )}
          {assignment.due_date && (
            <span>Due {new Date(assignment.due_date).toLocaleDateString()}</span>
          )}
        </div>

        {/* ── Content exercise — read-only, mark complete ── */}
        {isContent && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 space-y-4">
              {assignment.framing_content ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{assignment.framing_content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">No content available.</p>
              )}
              {assignment.prompt_text && (
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-sm text-slate-300 leading-relaxed">{assignment.prompt_text}</p>
                </div>
              )}
            </div>
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            {isAlreadyDone ? (
              <div className="py-3 px-4 bg-green-900/20 border border-green-700/30 rounded-xl text-center">
                <span className="text-green-400 text-sm font-medium">✓ Completed</span>
              </div>
            ) : (
              <button
                onClick={() => handleComplete('read')}
                disabled={saving}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-xl font-medium transition-all disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Mark as Complete →'}
              </button>
            )}
          </div>
        )}

        {/* ── Milestone exercise — coach meeting checkpoint ── */}
        {isMilestone && (
          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-6 space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-3">📅</div>
                <h2 className="text-base font-semibold text-white">{assignment.exercise_title}</h2>
              </div>
              {assignment.framing_content ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{assignment.framing_content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-slate-300 text-center">
                  Schedule a meeting with your coach to review your work before continuing.
                </p>
              )}
            </div>
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            {isAlreadyDone ? (
              <div className="py-3 px-4 bg-green-900/20 border border-green-700/30 rounded-xl text-center">
                <span className="text-green-400 text-sm font-medium">✓ Meeting Scheduled</span>
              </div>
            ) : (
              <button
                onClick={() => handleComplete('scheduled')}
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl font-medium transition-all disabled:opacity-50"
              >
                {saving ? 'Saving…' : '✓ Meeting Scheduled — Continue'}
              </button>
            )}
          </div>
        )}

        {/* ── Standard exercise — tabs: Context / Write / Drafts ── */}
        {!isContent && !isMilestone && (
          <>
            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1">
              {[
                { key: 'guide' as const, label: '📖 Context' },
                ...(!isComplete ? [{ key: 'write' as const, label: '✍️ Write' }] : []),
                ...(responses.length > 0 ? [{ key: 'history' as const, label: `🕐 Drafts (${responses.length})` }] : []),
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === t.key
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Context / framing */}
            {activeTab === 'guide' && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 space-y-4">
                {assignment.framing_content ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {assignment.framing_content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No context available for this exercise.</p>
                )}
                {assignment.prompt_text && (
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">The prompt</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{assignment.prompt_text}</p>
                  </div>
                )}
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('write')}
                    className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-all"
                  >
                    Start Writing →
                  </button>
                </div>
              </div>
            )}

            {/* Write */}
            {activeTab === 'write' && (
              <div className="space-y-4">
                {/* Structured exercise — render each field as a labeled textarea */}
                {isStructured && schema ? (
                  <div className="space-y-6">
                    {schema.fields.map(field => (
                      <div key={field.id} className="space-y-2">
                        <label className="block text-sm text-slate-200 leading-snug font-medium">
                          {field.label}
                        </label>
                        <textarea
                          value={structuredBody[field.id] || ''}
                          onChange={e => setStructuredBody(prev => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder="Write whatever comes to mind…"
                          rows={4}
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 resize-y focus:outline-none focus:border-violet-500/50 leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Free-write exercise — single textarea */
                  <>
                    {assignment.prompt_text && (
                      <p className="text-sm text-slate-400 bg-slate-800/30 rounded-lg p-3 leading-relaxed">
                        {assignment.prompt_text}
                      </p>
                    )}
                    <textarea
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      placeholder="Write whatever comes to mind…"
                      rows={16}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 resize-y focus:outline-none focus:border-violet-500/50 leading-relaxed"
                    />
                  </>
                )}

                <div className="flex items-center justify-between">
                  <span className={`text-xs tabular-nums ${
                    !withinLimit ? 'text-red-400' : wc > 0 ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {wc} {wc === 1 ? 'word' : 'words'}
                    {assignment.word_limit && (
                      <span className="text-slate-600"> / {assignment.word_limit} max</span>
                    )}
                    {assignment.word_limit && !withinLimit && (
                      <span className="text-red-400"> — over by {wc - assignment.word_limit}</span>
                    )}
                  </span>

                  <div className="flex items-center gap-3">
                    {saved && <span className="text-xs text-green-400">Saved ✓</span>}
                    {error && <span className="text-xs text-red-400">{error}</span>}
                    <button
                      onClick={handleSave}
                      disabled={saving || !(isStructured
                        ? Object.values(structuredBody).some(v => v.trim())
                        : body.trim())}
                      className="px-4 py-1.5 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving && (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      {saving ? 'Saving…' : 'Save Draft'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Draft history */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {responses.map(r => (
                  <div key={r.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">
                        Draft {r.revision_number} · {r.word_count ?? wordCount(r.content || '')} words
                      </span>
                      <span className="text-xs text-slate-600">
                        {new Date(r.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.coach_notes && (
                      <div className="mb-2 px-3 py-2 bg-violet-900/20 border border-violet-700/30 rounded-lg">
                        <p className="text-xs text-violet-300 font-medium mb-0.5">Coach feedback</p>
                        <p className="text-xs text-slate-300">{r.coach_notes}</p>
                      </div>
                    )}
                    {/* Structured: show each question+answer; free-write: plain text */}
                    {isStructured && schema && r.content ? (() => {
                      let parsed: Record<string, string> = {}
                      try { parsed = JSON.parse(r.content) } catch { /* ignore */ }
                      return (
                        <div className="space-y-2 mt-1">
                          {schema.fields.map(f => parsed[f.id] ? (
                            <div key={f.id}>
                              <p className="text-xs text-slate-500 mb-0.5 line-clamp-1">{f.label}</p>
                              <p className="text-xs text-slate-300 line-clamp-2 whitespace-pre-wrap">{parsed[f.id]}</p>
                            </div>
                          ) : null)}
                        </div>
                      )
                    })() : (
                      <p className="text-sm text-slate-300 line-clamp-3 whitespace-pre-wrap">{r.content}</p>
                    )}
                    <button
                      onClick={() => {
                        if (isStructured && r.content) {
                          try { setStructuredBody(JSON.parse(r.content)) } catch { /* ignore */ }
                        } else {
                          setBody(r.content || '')
                        }
                        setActiveTab('write')
                      }}
                      className="mt-2 text-xs text-violet-400 hover:text-violet-300"
                    >
                      Restore this draft →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function AssignmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AssignmentPageInner />
    </Suspense>
  )
}
