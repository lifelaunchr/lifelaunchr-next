'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://lifelaunchr.onrender.com'

interface Assignment {
  id: number
  student_id: number
  exercise_id: number
  status: string
  note_to_student: string | null
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

function AssignmentPageInner() {
  const { getToken, isLoaded } = useAuth()
  const params = useParams()
  const searchParams = useSearchParams()
  const assignmentId = params.id as string
  const forParam = searchParams.get('for')

  const [token, setToken] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [body, setBody] = useState('')
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
          setBody(a.responses[0].content || '')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token, assignmentId])

  function wordCount(text: string) {
    return text.trim() ? text.trim().split(/\s+/).length : 0
  }

  async function handleSave() {
    if (!token || !body.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/writing/assignments/${assignmentId}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: body }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { detail?: string }).detail || 'Save failed')
      }
      const data = await res.json()
      // Add new response to top of list
      const newResponse: Response = {
        id: data.response.id,
        content: body,
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
  const wc = wordCount(body)
  const withinLimit = !assignment.word_limit || wc <= assignment.word_limit

  // Section back-link
  const sectionMap: Record<string, string> = {
    self_discovery: 'sd-2',
    writing_practice: 'practice',
    commonapp: 'commonapp',
    uc_piqs: 'uc_piqs',
    why_major: 'why_major',
    why_college: 'why_college',
  }
  const backSection = sectionMap[assignment.section_key] || ''
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

        {/* Coach note */}
        {assignment.note_to_student && (
          <div className="bg-violet-900/20 border border-violet-700/30 rounded-xl px-4 py-3">
            <p className="text-xs text-violet-300 font-medium mb-0.5">Note from your coach</p>
            <p className="text-sm text-slate-300 italic">{assignment.note_to_student}</p>
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

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1">
          {[
            { key: 'guide' as const, label: '📖 Context' },
            { key: 'write' as const, label: '✍️ Write' },
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
          <div className="space-y-3">
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

            <div className="flex items-center justify-between">
              <span className={`text-xs ${!withinLimit ? 'text-red-400' : 'text-slate-500'}`}>
                {wc} {wc === 1 ? 'word' : 'words'}
                {assignment.word_limit && !withinLimit && ` (over limit by ${wc - assignment.word_limit})`}
              </span>

              <div className="flex items-center gap-3">
                {saved && <span className="text-xs text-green-400">Saved ✓</span>}
                {error && <span className="text-xs text-red-400">{error}</span>}
                <button
                  onClick={handleSave}
                  disabled={saving || !body.trim()}
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
            {responses.map((r, i) => (
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
                <p className="text-sm text-slate-300 line-clamp-3 whitespace-pre-wrap">{r.content}</p>
                <button
                  onClick={() => {
                    setBody(r.content || '')
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
