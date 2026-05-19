'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://lifelaunchr.onrender.com'

// Shared markdown component styles for framing_content blocks
const framingComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-violet-300 text-[11px] font-semibold uppercase tracking-widest mt-6 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-slate-200 text-sm font-semibold mt-5 mb-1.5 first:mt-0">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-slate-300 leading-relaxed mb-3 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 pl-5 list-disc list-outside space-y-1.5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 pl-5 list-decimal list-outside space-y-1.5 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-sm text-slate-300 leading-relaxed marker:text-violet-400">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-white font-semibold">{children}</strong>
  ),
  hr: () => <hr className="border-slate-700 my-4" />,
}

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
  soar_observations?: string | null
}

interface StructuredField {
  id: string
  label: string
  prompt?: string
  type: 'textarea' | 'text'
  optional?: boolean
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
  const [accountType, setAccountType] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [schedulingLink, setSchedulingLink] = useState<string | null>(null)
  const [body, setBody] = useState('')
  // For structured exercises: per-field answers keyed by field id
  const [structuredBody, setStructuredBody] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'guide' | 'write' | 'history'>('guide')
  const [loading, setLoading] = useState(true)
  // Timed write state
  const [timerStarted, setTimerStarted] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerDone, setTimerDone] = useState(false)
  const [timerAutoSaved, setTimerAutoSaved] = useState(false)
  // Coach review state
  const [coachResponses, setCoachResponses] = useState<Response[]>([])
  const [coachNote, setCoachNote] = useState('')
  const [coachSaving, setCoachSaving] = useState(false)
  const [coachSaved, setCoachSaved] = useState(false)
  const [coachMarking, setCoachMarking] = useState(false)
  const [observations, setObservations] = useState('')
  const [generatingObs, setGeneratingObs] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    getToken().then(tok => { if (tok) setToken(tok) })
  }, [isLoaded, getToken])

  useEffect(() => {
    if (!token || !assignmentId) return
    // Fetch assignment + usage in parallel
    Promise.all([
      fetch(`${API}/writing/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`${API}/my-usage`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => ({})),
    ]).then(([assignmentData, usageData]) => {
      const a: Assignment = assignmentData.assignment
      setAssignment(a)
      setAccountType(usageData.account_type ?? null)
      if (usageData.scheduling_link) setSchedulingLink(usageData.scheduling_link)
      // Pre-populate write tab with most recent response (students only)
      if (a.responses && a.responses.length > 0) {
        const latest = a.responses[0]
        if (a.exercise_type === 'structured' && latest.content) {
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
    }).catch(() => setLoading(false))
  }, [token, assignmentId])

  // Coach: fetch full responses list (includes soar_observations) + pre-fill note
  useEffect(() => {
    if (!token || !assignmentId || accountType !== 'counselor') return
    fetch(`${API}/writing/assignments/${assignmentId}/responses`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const rows: Response[] = data.responses || []
        setCoachResponses(rows)
        if (rows[0]?.soar_observations) setObservations(rows[0].soar_observations)
      })
      .catch(() => {})
  }, [token, assignmentId, accountType])

  // Pre-fill coach note from assignment once loaded
  useEffect(() => {
    if (assignment && accountType === 'counselor') {
      setCoachNote(assignment.note_to_student || '')
    }
  }, [assignment, accountType])

  const generateObservations = useCallback(async () => {
    const latestId = coachResponses[0]?.id
    if (!latestId) return
    setGeneratingObs(true)
    setObservations('')
    try {
      const tok = await getToken()
      if (!tok) return
      const url = `${API}/writing/assignments/${assignmentId}/generate-observations?response_id=${latestId}`
      const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${tok}` } })
      if (!res.ok || !res.body) { setGeneratingObs(false); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          try {
            const evt = JSON.parse(line.slice(5).trim())
            if (evt.type === 'text' || evt.type === 'chunk') setObservations(prev => prev + evt.text)
          } catch { /* ignore */ }
        }
      }
    } finally {
      setGeneratingObs(false)
    }
  }, [coachResponses, assignmentId, getToken])

  const saveCoachNote = async () => {
    setCoachSaving(true)
    setCoachSaved(false)
    try {
      const tok = await getToken()
      if (!tok) return
      await fetch(`${API}/writing/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_to_student: coachNote }),
      })
      setCoachSaved(true)
      setTimeout(() => setCoachSaved(false), 2000)
    } finally {
      setCoachSaving(false)
    }
  }

  const markReviewed = async () => {
    setCoachMarking(true)
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API}/writing/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_to_student: coachNote, status: 'reviewed' }),
      })
      if (res.ok) {
        setAssignment(prev => prev ? { ...prev, status: 'reviewed', note_to_student: coachNote } : prev)
      }
    } finally {
      setCoachMarking(false)
    }
  }

  function wordCount(text: string) {
    return text.trim() ? text.trim().split(/\s+/).length : 0
  }

  // Mark a content/milestone exercise complete by posting a sentinel response + patching status
  async function handleComplete(sentinel: string) {
    const freshToken = await getToken()
    if (!freshToken) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/writing/assignments/${assignmentId}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: sentinel }),
      })
      if (!res.ok) throw new Error('Failed to save')
      // Advance status to submitted so the list badge shows Done / Scheduled ✓
      await fetch(`${API}/writing/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'submitted' }),
      })
      const sectionKey = assignment?.section_key ?? ''
      const backSection = SECTION_BACK[sectionKey] || ''
      const href = `/writing?section=${backSection}${forParam ? `&for=${forParam}` : ''}`
      window.location.href = href
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
    if (!hasContent) return
    const freshToken = await getToken()
    if (!freshToken) return
    setSaving(true)
    setError(null)
    const content = isStructured ? JSON.stringify(structuredBody) : body
    try {
      const res = await fetch(`${API}/writing/assignments/${assignmentId}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${freshToken}`,
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

  async function handleSubmitForReview() {
    const isStructured = assignment?.exercise_type === 'structured'
    const hasContent = isStructured
      ? Object.values(structuredBody).some(v => v.trim())
      : body.trim()
    const freshToken = await getToken()
    if (!freshToken) return
    setSubmitting(true)
    setError(null)
    try {
      // Save current content first (if any typed)
      if (hasContent && assignment) {
        const content = isStructured ? JSON.stringify(structuredBody) : body
        const saveRes = await fetch(`${API}/writing/assignments/${assignmentId}/responses`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        if (!saveRes.ok) {
          const err = await saveRes.json().catch(() => ({}))
          throw new Error((err as { detail?: string }).detail || 'Save failed')
        }
      }
      // Mark as submitted
      const patchRes = await fetch(`${API}/writing/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'submitted' }),
      })
      if (!patchRes.ok) throw new Error('Submit failed')
      setAssignment(prev => prev ? { ...prev, status: 'submitted' } : prev)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Timed write helpers ──────────────────────────────────────────────────

  // Auto-save when timer hits zero (stable ref so the interval closure sees it)
  const autoSaveRef = useRef<() => Promise<void>>(async () => {})
  autoSaveRef.current = async () => {
    if (!body.trim()) return
    const freshToken = await getToken()
    if (!freshToken) return
    try {
      await fetch(`${API}/writing/assignments/${assignmentId}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: body }),
      })
      setTimerAutoSaved(true)
    } catch { /* silent — student still has text in the textarea */ }
  }

  const startTimer = useCallback(() => {
    const minutes = assignment?.time_limit_minutes ?? 10
    setTimerSeconds(minutes * 60)
    setTimerStarted(true)
    setTimerDone(false)
    setTimerAutoSaved(false)
  }, [assignment?.time_limit_minutes])

  // Countdown interval
  useEffect(() => {
    if (!timerStarted || timerDone) return
    const id = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(id)
          setTimerDone(true)
          autoSaveRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [timerStarted, timerDone])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // ─────────────────────────────────────────────────────────────────────────

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

  const isCounselor = accountType === 'counselor'

  // ── Coach view ────────────────────────────────────────────────────────────
  if (isCounselor && forParam) {
    const latestResponse = coachResponses[0]
    const schemaFields = (assignment.response_schema as { fields?: StructuredField[] })?.fields ?? []
    const isStructuredEx = assignment.exercise_type === 'structured' && schemaFields.length > 0
    const structuredAnswers: Record<string, string> = (() => {
      if (!latestResponse?.content) return {}
      try {
        const parsed = JSON.parse(latestResponse.content)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, string>
      } catch { /* plain text */ }
      return {}
    })()
    const hasResponse = !!latestResponse && (
      isStructuredEx
        ? Object.values(structuredAnswers).some(v => v?.trim())
        : !!(latestResponse.content?.trim())
    )
    const backHref = `/writing?for=${forParam}&from=writing`

    return (
      <div className="min-h-screen bg-slate-900 text-white">
        {/* Header */}
        <div className="border-b border-slate-800 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button
              onClick={() => { window.location.href = backHref }}
              className="text-slate-400 hover:text-white text-sm flex-shrink-0"
            >
              ← {assignment.unit_title}
            </button>
            <span className="text-slate-700">|</span>
            <h1 className="text-base font-semibold truncate">{assignment.exercise_title}</h1>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-violet-900/30 text-violet-400 border border-violet-700/40 flex-shrink-0">
              Coach view
            </span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

          {/* Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-fit ${
            assignment.status === 'reviewed' || assignment.status === 'complete'
              ? 'bg-green-900/20 text-green-400 border border-green-700/30'
              : assignment.status === 'submitted'
              ? 'bg-violet-900/20 text-violet-300 border border-violet-700/30'
              : 'bg-slate-700/50 text-slate-400 border border-slate-700'
          }`}>
            {assignment.status === 'reviewed' || assignment.status === 'complete'
              ? '✓ Reviewed'
              : assignment.status === 'submitted'
              ? '⏳ Submitted — awaiting review'
              : assignment.status === 'in_progress'
              ? '✍️ In progress'
              : '📋 Assigned'}
          </div>

          {/* Student response */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Student Response</p>
              {latestResponse && (
                <p className="text-xs text-slate-500">
                  Revision {latestResponse.revision_number}
                  {' · '}
                  {new Date(latestResponse.submitted_at).toLocaleDateString()}
                  {coachResponses.length > 1 && <span className="ml-2 text-slate-600">({coachResponses.length} revisions)</span>}
                  {latestResponse.word_count != null && <span className="ml-2 text-slate-600">{latestResponse.word_count} words</span>}
                </p>
              )}
            </div>
            {hasResponse ? (
              <div className="bg-slate-700/30 rounded-xl border border-slate-600/40 p-4 space-y-4">
                {isStructuredEx ? (
                  schemaFields.map(field => {
                    const answer = structuredAnswers[field.id]
                    if (!answer?.trim()) return null
                    return (
                      <div key={field.id}>
                        <p className="text-xs font-semibold text-violet-400 mb-1">{field.label}</p>
                        <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{answer}</p>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{latestResponse!.content}</p>
                )}
              </div>
            ) : (
              <div className="bg-slate-700/20 rounded-xl border border-slate-700/30 p-6 text-center">
                <p className="text-slate-500 text-sm">No response submitted yet.</p>
              </div>
            )}
          </div>

          {/* Soar Observations */}
          {hasResponse && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Soar Observations</p>
                <button
                  onClick={generateObservations}
                  disabled={generatingObs}
                  className="text-xs px-3 py-1 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 rounded-full border border-violet-600/30 transition-all disabled:opacity-50"
                >
                  {generatingObs ? 'Generating…' : observations ? '↺ Regenerate' : '✦ Generate'}
                </button>
              </div>
              {observations ? (
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 text-sm space-y-1">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({ children }) => <h2 className="text-xs font-semibold text-violet-300 uppercase tracking-wider mt-4 mb-1 first:mt-0">{children}</h2>,
                      p: ({ children }) => <p className="text-slate-200 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-slate-200 leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="text-slate-100 font-semibold">{children}</strong>,
                    }}
                  >
                    {observations}
                  </ReactMarkdown>
                </div>
              ) : generatingObs ? (
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 min-h-[60px] flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-400">Analysing response…</p>
                </div>
              ) : (
                <div className="bg-slate-700/20 rounded-xl border border-slate-700/30 p-4 text-center">
                  <p className="text-xs text-slate-500">Click Generate to have Soar analyse this response and surface coaching insights.</p>
                </div>
              )}
            </div>
          )}

          {/* Coach note */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">
              Coach Note to Student <span className="text-slate-600 normal-case">(visible to student)</span>
            </label>
            <textarea
              value={coachNote}
              onChange={e => setCoachNote(e.target.value)}
              rows={4}
              placeholder="Share feedback, encouragement, or guidance for this exercise…"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          {/* Action row */}
          <div className="flex items-center justify-between gap-3 pb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={saveCoachNote}
                disabled={coachSaving}
                className="px-4 py-2 rounded-lg text-sm bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50 transition-all"
              >
                {coachSaving ? 'Saving…' : 'Save note'}
              </button>
              {coachSaved && <span className="text-xs text-green-400">Saved ✓</span>}
            </div>
            {(assignment.status === 'submitted' || assignment.status === 'in_progress') && (
              <button
                onClick={markReviewed}
                disabled={coachMarking}
                className="px-4 py-2 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {coachMarking && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {coachMarking ? 'Marking…' : '✓ Mark as Reviewed'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
  // ── End coach view ─────────────────────────────────────────────────────────

  const responses = assignment.responses || []
  const isContent = assignment.exercise_type === 'content'
  const isMilestone = assignment.exercise_type === 'milestone'
  const isStructured = assignment.exercise_type === 'structured'
  const isTimedWrite = assignment.exercise_type === 'timed_write'
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
  const isSubmitted = assignment.status === 'submitted'

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
        {(isSubmitted || isReviewed || isComplete) && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-fit ${
            isComplete
              ? 'bg-slate-700/50 text-slate-400 border border-slate-700'
              : isReviewed
              ? 'bg-green-900/20 text-green-400 border border-green-700/30'
              : 'bg-violet-900/20 text-violet-300 border border-violet-700/30'
          }`}>
            {isComplete ? '✓ Complete' : isReviewed ? '✓ Reviewed by coach' : '⏳ Submitted — awaiting coach review'}
          </div>
        )}

        {/* Coach note / feedback — context-aware styling */}
        {assignment.note_to_student && (
          isReviewed ? (
            /* Post-review feedback — prominent green treatment */
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl px-4 py-4 space-y-2">
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">Feedback from your coach</p>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{assignment.note_to_student}</p>
              {!isComplete && (
                <p className="text-xs text-slate-500 pt-1">You can revise and resubmit using the Write tab below.</p>
              )}
            </div>
          ) : (
            /* Pre-assignment note */
            <div className="bg-violet-900/20 border border-violet-700/30 rounded-xl px-4 py-3">
              <p className="text-xs text-violet-300 font-medium mb-1">Note from your coach</p>
              <p className="text-sm text-slate-300 italic">{assignment.note_to_student}</p>
            </div>
          )
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
                <div className="space-y-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={framingComponents}>{assignment.framing_content}</ReactMarkdown>
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
                <div className="space-y-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={framingComponents}>{assignment.framing_content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-slate-300 text-center">
                  Meet with your coach to review your work before continuing.
                </p>
              )}
              {schedulingLink && !isAlreadyDone && (
                <a
                  href={schedulingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl font-medium transition-all"
                >
                  📅 Schedule a meeting →
                </a>
              )}
            </div>
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            {isAlreadyDone ? (
              <div className="py-3 px-4 bg-green-900/20 border border-green-700/30 rounded-xl text-center">
                <span className="text-green-400 text-sm font-medium">✓ Done</span>
              </div>
            ) : (
              <button
                onClick={() => handleComplete('scheduled')}
                disabled={saving}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-xl font-medium transition-all disabled:opacity-50"
              >
                {saving ? 'Saving…' : "I've had this meeting — Continue →"}
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
                  <div className="space-y-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={framingComponents}>
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
                  {isReviewed ? (
                    <button
                      onClick={() => setActiveTab('history')}
                      className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-all"
                    >
                      View your drafts →
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (isTimedWrite && !isAlreadyDone) startTimer()
                        setActiveTab('write')
                      }}
                      className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-all"
                    >
                      {isTimedWrite && !isAlreadyDone
                        ? 'Start Writing — Timer Begins →'
                        : isAlreadyDone
                        ? 'Continue writing →'
                        : 'Start Writing →'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Write */}
            {activeTab === 'write' && (
              <div className="space-y-4">
                {/* Submitted state — show confirmation instead of editor */}
                {isSubmitted && (
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-5 py-10 text-center space-y-3">
                    <div className="text-3xl">📬</div>
                    <p className="text-sm font-semibold text-slate-200">Submitted for coach review</p>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                      Your coach will review your work and send feedback. You&apos;ll see their notes here when ready.
                    </p>
                    <p className="text-xs text-slate-600">Check the Drafts tab to see your submission.</p>
                  </div>
                )}
                {/* ── Timed write ── */}
                {!isSubmitted && isTimedWrite && (
                  <>
                    {/* Not yet started and no previous draft — prompt back to Context tab */}
                    {!timerStarted && !isAlreadyDone && (
                      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-5 py-8 text-center space-y-3">
                        <p className="text-sm text-slate-400">Go to the Context tab to read the prompt, then click <span className="text-white font-medium">Start Writing</span> when you&apos;re ready.</p>
                        <button
                          onClick={() => setActiveTab('guide')}
                          className="text-xs text-violet-400 hover:text-violet-300"
                        >
                          ← Back to Context
                        </button>
                      </div>
                    )}

                    {/* Active timer + textarea */}
                    {timerStarted && !timerDone && (
                      <div className="space-y-3">
                        <div className={`flex items-center justify-center gap-2 py-2 rounded-xl font-mono text-2xl font-bold tracking-widest ${
                          timerSeconds <= 30 ? 'text-red-400' : timerSeconds <= 120 ? 'text-amber-400' : 'text-violet-300'
                        }`}>
                          {formatTime(timerSeconds)}
                        </div>
                        <textarea
                          value={body}
                          onChange={e => setBody(e.target.value)}
                          placeholder="Start writing — don't stop…"
                          autoFocus
                          rows={16}
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 resize-y focus:outline-none focus:border-violet-500/50 leading-relaxed"
                        />
                      </div>
                    )}

                    {/* Time's up */}
                    {(timerDone || isAlreadyDone) && (
                      <div className="space-y-4">
                        {timerDone && (
                          <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                            timerAutoSaved
                              ? 'bg-green-900/20 border border-green-700/30 text-green-400'
                              : 'bg-slate-800/50 border border-slate-700/50 text-slate-400'
                          }`}>
                            {timerAutoSaved ? "⏱ Time's up — draft saved" : "⏱ Time's up"}
                          </div>
                        )}
                        <textarea
                          value={body}
                          onChange={e => setBody(e.target.value)}
                          placeholder="Write whatever comes to mind…"
                          rows={16}
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 resize-y focus:outline-none focus:border-violet-500/50 leading-relaxed"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Structured exercise — render each field as a labeled textarea */}
                {!isSubmitted && !isTimedWrite && isStructured && schema ? (
                  <div className="space-y-8">
                    {schema.fields.map(field => (
                      <div key={field.id} className="space-y-2">
                        <label className="block text-sm text-slate-200 leading-snug font-medium">
                          {field.label}
                          {field.optional && <span className="ml-1.5 text-xs text-slate-500 font-normal">(optional)</span>}
                        </label>
                        {field.prompt && (
                          <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-slate-700 pl-3">
                            {field.prompt}
                          </p>
                        )}
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
                ) : !isSubmitted && !isTimedWrite ? (
                  /* Free-write / synthesis exercise — single textarea */
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
                ) : null}

                {/* Action bar — hidden during active countdown, and when not yet started on timed writes */}
                {!isSubmitted && !(isTimedWrite && !timerStarted && !isAlreadyDone) && !(isTimedWrite && timerStarted && !timerDone) && (
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
                      {saved && <span className="text-xs text-green-400">Draft saved ✓ — submit when ready</span>}
                      {error && <span className="text-xs text-red-400">{error}</span>}
                      {/* Save Draft hidden for timed writes — auto-saved at time's up */}
                      {!isTimedWrite && (
                        <button
                          onClick={handleSave}
                          disabled={saving || submitting || !(isStructured
                            ? Object.values(structuredBody).some(v => v.trim())
                            : body.trim())}
                          className="px-4 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {saving && (
                            <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                          )}
                          {saving ? 'Saving…' : 'Save Draft'}
                        </button>
                      )}
                      <button
                        onClick={handleSubmitForReview}
                        disabled={saving || submitting || (
                          !(isStructured
                            ? Object.values(structuredBody).some(v => v.trim())
                            : body.trim()) && responses.length === 0
                        )}
                        className="px-4 py-1.5 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {submitting && (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {submitting ? 'Submitting…' : 'Submit for Review'}
                      </button>
                    </div>
                  </div>
                )}
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
