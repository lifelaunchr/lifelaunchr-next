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
  course_id: number
  sort_order: number
  title: string
  description: string | null
  word_count_min: number | null
  word_count_max: number | null
  guide_markdown: string | null
}

interface Submission {
  id: number
  assignment_id: number
  student_id: number
  body: string
  word_count: number
  submitted_at: string
}

function AssignmentPageInner() {
  const { getToken, isLoaded } = useAuth()
  const params = useParams()
  const searchParams = useSearchParams()
  const assignmentId = params.id as string
  const forParam = searchParams.get('for')

  const [token, setToken] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'guide' | 'write' | 'history'>('guide')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    getToken().then(tok => {
      if (!tok) return
      setToken(tok)
    })
  }, [isLoaded, getToken])

  useEffect(() => {
    if (!token || !assignmentId) return

    // Load assignment
    fetch(`${API}/writing/assignments/${assignmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setAssignment(data.assignment || data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Load previous submissions
    const subUrl = `${API}/writing/submissions?assignment_id=${assignmentId}${forParam ? `&student_id=${forParam}` : ''}`
    fetch(subUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const subs: Submission[] = data.submissions || []
        setSubmissions(subs)
        if (subs.length > 0) setBody(subs[0].body)
      })
      .catch(() => {})
  }, [token, assignmentId, forParam])

  function wordCount(text: string) {
    return text.trim() ? text.trim().split(/\s+/).length : 0
  }

  async function handleSave() {
    if (!token || !body.trim()) return
    setSaving(true)
    setError(null)
    try {
      const url = `${API}/writing/submissions${forParam ? `?student_id=${forParam}` : ''}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignment_id: parseInt(assignmentId), body }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Save failed')
      }
      const data = await res.json()
      setSubmissions(prev => [data.submission, ...prev])
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

  const wc = wordCount(body)
  const withinLimit = !assignment.word_count_max || wc <= assignment.word_count_max
  const meetsMin = !assignment.word_count_min || wc >= assignment.word_count_min

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href={`/writing${forParam ? `?for=${forParam}` : ''}`}
            className="text-slate-400 hover:text-white text-sm"
          >
            ← Writing
          </Link>
          <span className="text-slate-700">|</span>
          <h1 className="text-base font-semibold truncate">{assignment.title}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Word count info */}
        {(assignment.word_count_min || assignment.word_count_max) && (
          <p className="text-xs text-slate-500">
            {assignment.word_count_min && assignment.word_count_max
              ? `${assignment.word_count_min}–${assignment.word_count_max} words`
              : assignment.word_count_max
              ? `Up to ${assignment.word_count_max} words`
              : `At least ${assignment.word_count_min} words`}
          </p>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1">
          {[
            { key: 'guide' as const, label: '📖 Guide' },
            { key: 'write' as const, label: '✍️ Write' },
            ...(submissions.length > 0 ? [{ key: 'history' as const, label: `🕐 History (${submissions.length})` }] : []),
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

        {/* Guide */}
        {activeTab === 'guide' && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
            {assignment.guide_markdown ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {assignment.guide_markdown}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No guide available for this assignment.</p>
            )}
            <div className="mt-5 pt-4 border-t border-slate-700">
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
            {assignment.description && (
              <p className="text-sm text-slate-400 bg-slate-800/30 rounded-lg p-3">
                {assignment.description}
              </p>
            )}

            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Start writing here…"
              rows={16}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 resize-y focus:outline-none focus:border-violet-500/50 leading-relaxed"
            />

            <div className="flex items-center justify-between">
              <span className={`text-xs ${!withinLimit ? 'text-red-400' : !meetsMin ? 'text-slate-500' : 'text-green-400'}`}>
                {wc} {wc === 1 ? 'word' : 'words'}
                {assignment.word_count_max && !withinLimit && ` (over limit by ${wc - assignment.word_count_max})`}
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

        {/* History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {submissions.map((sub, i) => (
              <div key={sub.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">
                    Draft {submissions.length - i} · {sub.word_count} words
                  </span>
                  <span className="text-xs text-slate-600">
                    {new Date(sub.submitted_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-300 line-clamp-3 whitespace-pre-wrap">{sub.body}</p>
                <button
                  onClick={() => {
                    setBody(sub.body)
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
