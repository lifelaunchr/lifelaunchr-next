'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://lifelaunchr.onrender.com'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Student {
  id: number
  full_name: string | null
  email: string | null
  writing_track: 'long_form' | 'sprint' | null
}

interface EnabledModules {
  selfDiscovery: boolean
  writingPractice: boolean
  commonApp: boolean
  ucPiqs: boolean
  whyEssays: boolean
  essayHub?: boolean
}

interface WritingAssignment {
  id: number
  exercise_id: number
  status: 'assigned' | 'in_progress' | 'submitted' | 'reviewed'
  note_to_student: string | null
  due_date: string | null
  assigned_at: string
  exercise_title: string
  prompt_text: string | null
  framing_content: string | null
  exercise_type: string
  word_limit: number | null
  time_limit_minutes: number | null
  is_timed: boolean
  unit_title: string
  section_key: string
  section_title: string
  latest_revision: number | null
  last_submitted_at: string | null
  response_schema: { type: string; fields: Array<{ id: string; label: string; prompt: string; type: string }> } | null
}

// ── Essay Plan types ───────────────────────────────────────────────────────────

interface EssayPlanTop10Item {
  rank: number
  label: string
  evidence: string
  is_essay_anchor: boolean
  source: string
  tension: string
  _caveat?: string
}

interface EssayPlanTop10 {
  student_name: string
  item_count: number
  items: EssayPlanTop10Item[]
  assignments_to_redo: Array<{
    exercise_name: string
    why_promising: string
    coaching_asks: string[]
    priority: string
  }>
  opening_question: string
  data_quality_note?: string
}

interface EssayPlanConcept {
  rank: number
  label: string
  readiness: string
  theme: string
  category: string
  overcrowded?: boolean
  escape_ingredient?: string | null
  story_structure?: {
    has_natural_arc: boolean
    structure_note: string
  }
  core_claim: string
  risk_factors?: string[]
  viability_note?: string
}

interface EssayPlanCommonApp {
  student_name: string
  data_integrity_note?: string | null
  concepts: EssayPlanConcept[]
  triage_note: string
  student_facing_summary: string
}

interface EssayPlanPiq {
  piq_number: number
  piq_keyword: string
  topic_label: string
  why_this_student: string
  concrete_example: string
  reflection: string
  forward_connection: string
  drift_risk: string
  readiness: string
}

interface EssayPlanUcPiqs {
  student_name: string
  data_integrity_flag?: string | null
  recommended_piqs: EssayPlanPiq[]
  diversity_check: string
  triage_note: string
  student_facing_summary: string | string[]
}

interface EssayPlanWhyMajor {
  student_name: string
  intended_major: string
  major_confidence: string
  major_mismatch_flag?: string
  origin_moment?: { description: string; quality: string }
  development_arc?: string[]
  intellectual_hook?: { description: string; quality: string }
  goals_connection?: string
  drift_risk?: string
  uc_flag?: string
  readiness: string
  triage_note: string
  student_facing_summary: string
}

interface EssayPlanSections {
  top10?: EssayPlanTop10
  commonapp?: EssayPlanCommonApp
  uc_piqs?: EssayPlanUcPiqs
  why_major?: EssayPlanWhyMajor
}

interface AssignmentResponse {
  id: number
  content: string | null
  structured_data: Record<string, string> | null
  word_count: number | null
  revision_number: number
  submitted_at: string
  coach_notes: string | null
  coach_reviewed_at: string | null
  soar_observations: string | null
}

interface LibraryExercise {
  id: number
  title: string
  prompt_text: string | null
  framing_content: string | null
  exercise_type: string
  word_limit: number | null
  time_limit_minutes: number | null
  is_timed: boolean
  unit_title: string
  section_key: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WritingAssignment['status'] }) {
  const map: Record<string, { label: string; className: string }> = {
    assigned:    { label: 'Assigned',    className: 'bg-slate-700 text-slate-400' },
    in_progress: { label: 'In Progress', className: 'bg-blue-500/20 text-blue-400' },
    submitted:   { label: 'Submitted',   className: 'bg-amber-500/20 text-amber-400' },
    reviewed:    { label: 'Reviewed',    className: 'bg-green-500/20 text-green-400' },
  }
  const s = map[status] ?? map.assigned
  return (
    <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${s.className}`}>
      {s.label}
    </span>
  )
}

// ── AssignPanel ────────────────────────────────────────────────────────────────

function AssignPanel({
  sectionKey,
  sectionLabel,
  studentId,
  track,
  onAssigned,
  onClose,
}: {
  sectionKey: string
  sectionLabel: string
  studentId: number
  track: 'long_form' | 'sprint' | null
  onAssigned: () => void
  onClose: () => void
}) {
  const { getToken } = useAuth()
  const [exercises, setExercises] = useState<LibraryExercise[]>([])
  // Map of exerciseId → assignmentId for all currently-assigned exercises
  const [assignedMap, setAssignedMap] = useState<Map<number, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [assigning, setAssigning] = useState<number | null>(null)
  const [unassigning, setUnassigning] = useState<number | null>(null)
  const [unassignWarning, setUnassignWarning] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    getToken().then(tok => {
      if (!tok) { setFetchError('Not authenticated'); setLoading(false); return }
      // Fetch library exercises and student's existing assignments in parallel
      Promise.all([
        fetch(`${API}/writing/library?section_key=${sectionKey}`, {
          headers: { Authorization: `Bearer ${tok}` },
        }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() }),
        fetch(`${API}/writing/assignments?student_id=${studentId}`, {
          headers: { Authorization: `Bearer ${tok}` },
        }).then(r => r.ok ? r.json() : { assignments: [] }),
      ])
        .then(([libData, assignData]) => {
          setExercises(libData.exercises || [])
          const idMap = new Map<number, number>(
            (assignData.assignments || []).map((a: WritingAssignment) => [a.exercise_id, a.id])
          )
          setAssignedMap(idMap)
          setLoading(false)
        })
        .catch(err => { setFetchError(err.message || 'Failed to load'); setLoading(false) })
    })
  }, [sectionKey, studentId, getToken])

  const assign = async (exerciseId: number) => {
    setAssigning(exerciseId)
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API}/writing/assignments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          exercise_id: exerciseId,
          note_to_student: note || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const assignmentId: number = data.assignment?.id
        setAssignedMap(m => { const n = new Map(m); n.set(exerciseId, assignmentId); return n })
        onAssigned()
      }
    } finally {
      setAssigning(null)
    }
  }

  const unassign = async (exerciseId: number, force = false) => {
    const assignmentId = assignedMap.get(exerciseId)
    if (!assignmentId) return
    setUnassigning(exerciseId)
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API}/writing/assignments/${assignmentId}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.ok) {
        setAssignedMap(m => { const n = new Map(m); n.delete(exerciseId); return n })
        setUnassignWarning(null)
        onAssigned()
      } else if (res.status === 409) {
        setUnassignWarning(exerciseId)
      }
    } finally {
      setUnassigning(null)
    }
  }

  // Group exercises by unit, preserving display order
  const unitOrder: string[] = []
  const unitMap: Record<string, LibraryExercise[]> = {}
  for (const ex of exercises) {
    if (!unitMap[ex.unit_title]) {
      unitMap[ex.unit_title] = []
      unitOrder.push(ex.unit_title)
    }
    unitMap[ex.unit_title].push(ex)
  }

  // "Suggested next" = first unit that has at least one unassigned exercise
  const isAssigned = (id: number) => assignedMap.has(id)
  const suggestedUnit = unitOrder.find(u => unitMap[u].some(ex => !isAssigned(ex.id)))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-800 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h3 className="text-sm font-semibold text-white">Assign Exercise</h3>
            <p className="text-xs text-slate-400 mt-0.5">{sectionLabel}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Note field — sticky above scrollable list */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-700/50 flex-shrink-0">
          <label className="text-xs text-slate-400 block mb-1">Note to student (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Add context or specific instructions…"
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : fetchError ? (
            <p className="text-red-400 text-sm text-center py-8">Error loading exercises ({fetchError}).</p>
          ) : exercises.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No exercises available for this section yet.</p>
          ) : (
            <div className="space-y-5">
              {unitOrder.map(unitTitle => {
                const isSuggested = unitTitle === suggestedUnit
                const unitExercises = unitMap[unitTitle]
                const allAssigned = unitExercises.every(ex => isAssigned(ex.id))
                const unassignedInUnit = unitExercises.filter(ex => !isAssigned(ex.id))
                // Show "Assign all" for sprint track on multi-exercise units
                const showAssignAll = track === 'sprint' && unassignedInUnit.length > 1

                const assignAll = async () => {
                  for (const ex of unassignedInUnit) {
                    await assign(ex.id)
                  }
                }

                return (
                  <div key={unitTitle}>
                    {/* Unit header */}
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {unitTitle}
                      </h4>
                      {isSuggested && (
                        <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full font-medium">
                          suggested next
                        </span>
                      )}
                      {showAssignAll && !allAssigned && (
                        <button
                          onClick={assignAll}
                          className="ml-auto text-[10px] bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-medium transition-all"
                        >
                          Assign all ({unassignedInUnit.length})
                        </button>
                      )}
                    </div>

                    {/* Exercises in this unit */}
                    <div className="space-y-2">
                      {unitMap[unitTitle].map(ex => {
                        const done = isAssigned(ex.id)
                        return (
                          <div
                            key={ex.id}
                            className={`rounded-xl border p-3.5 transition-all ${
                              done
                                ? 'bg-slate-800/30 border-slate-700/30'
                                : 'bg-slate-700/40 border-slate-600/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium leading-tight ${done ? 'text-slate-500' : 'text-white'}`}>
                                  {ex.title}
                                </p>
                                {(ex.prompt_text || ex.framing_content) && !done && (
                                  <div className="mt-1">
                                    {ex.prompt_text ? (
                                      <>
                                        <p className={`text-xs text-slate-400 ${expandedId === ex.id ? '' : 'line-clamp-2'}`}>
                                          {ex.prompt_text}
                                        </p>
                                        <button
                                          onClick={e => { e.stopPropagation(); setExpandedId(expandedId === ex.id ? null : ex.id) }}
                                          className="text-[10px] text-violet-400 hover:text-violet-300 mt-0.5"
                                        >
                                          {expandedId === ex.id ? 'Show less' : 'Read more'}
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        {expandedId === ex.id && (
                                          <p className="text-xs text-slate-400 mb-0.5 whitespace-pre-wrap">
                                            {ex.framing_content}
                                          </p>
                                        )}
                                        <button
                                          onClick={e => { e.stopPropagation(); setExpandedId(expandedId === ex.id ? null : ex.id) }}
                                          className="text-[10px] text-violet-400 hover:text-violet-300 mt-0.5"
                                        >
                                          {expandedId === ex.id ? 'Hide content' : 'Show content'}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                                <div className="flex gap-2 mt-1.5 flex-wrap">
                                  <span className="text-[10px] text-slate-600 bg-slate-700/60 px-1.5 py-0.5 rounded">
                                    {ex.exercise_type}
                                  </span>
                                  {ex.word_limit && !done && (
                                    <span className="text-[10px] text-slate-600">{ex.word_limit}w</span>
                                  )}
                                  {ex.is_timed && ex.time_limit_minutes && !done && (
                                    <span className="text-[10px] text-slate-600">⏱ {ex.time_limit_minutes}min</span>
                                  )}
                                </div>
                              </div>
                              {done ? (
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => unassigning !== ex.id && unassign(ex.id)}
                                    disabled={unassigning === ex.id}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-slate-700/40 hover:bg-red-500/20 text-slate-400 hover:text-red-400 disabled:opacity-50"
                                  >
                                    {unassigning === ex.id ? '…' : 'Unassign'}
                                  </button>
                                  {unassignWarning === ex.id && (
                                    <div className="text-[10px] text-amber-400 text-right leading-relaxed">
                                      Student has submitted work.{' '}
                                      <button onClick={() => unassign(ex.id, true)} className="underline">Unassign anyway</button>
                                      {' · '}
                                      <button onClick={() => setUnassignWarning(null)} className="underline text-slate-400">Cancel</button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => assign(ex.id)}
                                  disabled={assigning === ex.id}
                                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                                >
                                  {assigning === ex.id ? '…' : 'Assign'}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ReviewPanel ────────────────────────────────────────────────────────────────

function ReviewPanel({
  assignment,
  onClose,
  onReviewed,
}: {
  assignment: WritingAssignment
  onClose: () => void
  onReviewed: () => void
}) {
  const { getToken } = useAuth()
  const [responses, setResponses] = useState<AssignmentResponse[]>([])
  const [loadingResponses, setLoadingResponses] = useState(true)
  const [note, setNote] = useState(assignment.note_to_student || '')
  const [saving, setSaving] = useState(false)
  const [marking, setMarking] = useState(false)
  const [saved, setSaved] = useState(false)
  const [observations, setObservations] = useState<string>('')
  const [generatingObs, setGeneratingObs] = useState(false)

  useEffect(() => {
    getToken().then(tok => {
      if (!tok) { setLoadingResponses(false); return }
      fetch(`${API}/writing/assignments/${assignment.id}/responses`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
        .then(r => r.json())
        .then(data => {
          const rows: AssignmentResponse[] = data.responses || []
          setResponses(rows)
          // Pre-populate observations from the latest response if already generated
          if (rows.length > 0 && rows[0].soar_observations) {
            setObservations(rows[0].soar_observations)
          }
          setLoadingResponses(false)
        })
        .catch(() => setLoadingResponses(false))
    })
  }, [assignment.id, getToken])

  const saveNote = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const tok = await getToken()
      if (!tok) return
      await fetch(`${API}/writing/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_to_student: note }),
      })
      onReviewed() // refresh parent data so re-opening the panel shows the saved note
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const markReviewed = async () => {
    setMarking(true)
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API}/writing/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_to_student: note, status: 'reviewed' }),
      })
      if (res.ok) {
        onReviewed()
        onClose()
      }
    } finally {
      setMarking(false)
    }
  }

  const generateObservations = useCallback(async () => {
    const latestId = responses[0]?.id
    if (!latestId) return
    setGeneratingObs(true)
    setObservations('')
    try {
      const tok = await getToken()
      if (!tok) return
      const url = `${API}/writing/assignments/${assignment.id}/generate-observations?response_id=${latestId}`
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
          } catch { /* ignore parse errors */ }
        }
      }
    } finally {
      setGeneratingObs(false)
    }
  }, [responses, assignment.id, getToken])

  // The latest response is first (ORDER BY revision_number DESC)
  const latestResponse = responses[0]

  // Parse structured fields from schema + response data
  const schemaFields = assignment.response_schema?.fields ?? []
  const structuredAnswers: Record<string, string> = (() => {
    if (!latestResponse) return {}
    // Try structured_data first (JSONB col, returned as object by API)
    if (latestResponse.structured_data) {
      if (typeof latestResponse.structured_data === 'string') {
        try { return JSON.parse(latestResponse.structured_data) } catch { /* fall through */ }
      } else {
        return latestResponse.structured_data as Record<string, string>
      }
    }
    // Fallback: student stores JSON.stringify(structuredBody) into content column
    if (latestResponse.content) {
      try {
        const parsed = JSON.parse(latestResponse.content)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, string>
        }
      } catch { /* plain-text content, not JSON */ }
    }
    return {}
  })()

  const isStructured = assignment.exercise_type === 'structured' && schemaFields.length > 0
  const hasResponse = !!latestResponse && (
    isStructured
      ? Object.values(structuredAnswers).some(v => v?.trim())
      : !!(latestResponse.content?.trim())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-slate-800 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h3 className="text-sm font-semibold text-white">{assignment.exercise_title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {assignment.section_title} · {assignment.unit_title}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ── Prompt / Content ── */}
          {(assignment.prompt_text || assignment.framing_content) && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                {assignment.prompt_text ? 'Prompt' : 'Content'}
              </p>
              <div className="bg-slate-700/20 rounded-xl border border-slate-700/30 px-4 py-3">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {assignment.prompt_text ?? assignment.framing_content}
                </p>
              </div>
            </div>
          )}

          {/* ── Student Response ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Student Response</p>
              {latestResponse && (
                <p className="text-xs text-slate-500">
                  Revision {latestResponse.revision_number}
                  {' · '}
                  {latestResponse.submitted_at
                    ? new Date(latestResponse.submitted_at).toLocaleDateString()
                    : '—'}
                  {responses.length > 1 && (
                    <span className="ml-2 text-slate-600">({responses.length} revisions)</span>
                  )}
                  {latestResponse.word_count != null && (
                    <span className="ml-2 text-slate-600">{latestResponse.word_count} words</span>
                  )}
                </p>
              )}
            </div>

            {loadingResponses ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : hasResponse ? (
              <div className="bg-slate-700/30 rounded-xl border border-slate-600/40 p-4 space-y-4">
                {isStructured ? (
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
                  <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {latestResponse!.content}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-slate-700/20 rounded-xl border border-slate-700/30 p-6 text-center">
                <p className="text-slate-500 text-sm">No response submitted yet.</p>
              </div>
            )}
          </div>

          {/* ── Soar Observations ── */}
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
                      h2: ({ children }) => (
                        <h2 className="text-xs font-semibold text-violet-300 uppercase tracking-wider mt-4 mb-1 first:mt-0">{children}</h2>
                      ),
                      p: ({ children }) => (
                        <p className="text-slate-200 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 space-y-1">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 space-y-1">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-slate-200 leading-relaxed">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-slate-100 font-semibold">{children}</strong>
                      ),
                    }}
                  >
                    {observations}
                  </ReactMarkdown>
                </div>
              ) : generatingObs ? (
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 min-h-[60px] flex items-center">
                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mr-2" />
                  <p className="text-sm text-slate-400">Analyzing response…</p>
                </div>
              ) : (
                <div className="bg-slate-700/20 rounded-xl border border-slate-700/30 p-4 text-center">
                  <p className="text-xs text-slate-500">
                    Click Generate to have Soar analyse this response and surface coaching insights.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Coach Notes ── */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">
              Coach Note to Student{' '}
              <span className="text-slate-600 normal-case">(visible to student)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              placeholder="Share feedback, encouragement, or guidance for this exercise…"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700 flex items-center justify-between gap-3">
          <button
            onClick={saveNote}
            disabled={saving}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-all disabled:opacity-50"
          >
            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Note'}
          </button>
          {assignment.status === 'submitted' && (
            <button
              onClick={markReviewed}
              disabled={marking}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-all disabled:opacity-50"
            >
              {marking ? 'Marking…' : 'Mark Reviewed ✓'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── EssayPlanPanel ────────────────────────────────────────────────────────────

type EssayPlanTab = 'top10' | 'commonapp' | 'uc_piqs' | 'why_major'

function readinessBadge(r: string) {
  const norm = r.toLowerCase().replace(/[\s_-]+/g, '_')
  if (norm.includes('ready')) return <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Ready</span>
  if (norm.includes('close') || norm.includes('medium')) return <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Close</span>
  return <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">Needs digging</span>
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="text-[10px] px-2 py-0.5 rounded bg-teal-600/20 text-teal-400 border border-teal-600/30 hover:bg-teal-600/30 transition-all"
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  )
}

function EssayPlanPanel({
  studentName,
  sections,
  generatedAt,
  generating,
  statusMsg,
  onGenerate,
  onClose,
}: {
  studentName: string
  sections: EssayPlanSections
  generatedAt: string | null
  generating: boolean
  statusMsg: string
  onGenerate: () => void
  onClose: () => void
}) {
  const ALL_TABS: { key: EssayPlanTab; label: string }[] = [
    { key: 'top10', label: 'Top 10' },
    { key: 'commonapp', label: 'CommonApp' },
    { key: 'uc_piqs', label: 'UC PIQs' },
    { key: 'why_major', label: 'Why Major' },
  ]
  const tabs = ALL_TABS.filter(t => !!sections[t.key])

  const [activeTab, setActiveTab] = useState<EssayPlanTab>(tabs[0]?.key ?? 'top10')

  const top10 = sections.top10
  const ca = sections.commonapp
  const piqs = sections.uc_piqs
  const wm = sections.why_major

  const summaryText = (s: string | string[] | undefined): string => {
    if (!s) return ''
    if (Array.isArray(s)) return s.join('\n\n')
    return s
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-slate-800 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-white">Essay Plan — {studentName}</h3>
            {generatedAt && (
              <p className="text-xs text-slate-500 mt-0.5">
                Generated {new Date(generatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onGenerate}
              disabled={generating}
              className="text-xs px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 rounded-lg border border-violet-600/30 transition-all disabled:opacity-50"
            >
              {generating ? 'Generating…' : generatedAt ? '↺ Regenerate' : '✦ Generate'}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none ml-1">×</button>
          </div>
        </div>

        {/* Status during generation */}
        {generating && statusMsg && (
          <div className="px-5 py-2.5 bg-violet-500/10 border-b border-violet-500/20 flex items-center gap-2 flex-shrink-0">
            <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-xs text-violet-300 truncate">{statusMsg}</p>
          </div>
        )}

        {/* Empty state */}
        {!generating && tabs.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <p className="text-slate-400 text-sm mb-1">No essay plan generated yet.</p>
            <p className="text-xs text-slate-500">Click Generate to run the analysis for this student.</p>
          </div>
        )}

        {/* Tab bar */}
        {tabs.length > 0 && (
          <div className="flex border-b border-slate-700 flex-shrink-0 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === t.key
                    ? 'text-violet-400 border-b-2 border-violet-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        {tabs.length > 0 && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* ── TOP 10 ── */}
            {activeTab === 'top10' && top10 && (
              <>
                {/* Opening question */}
                {top10.opening_question && (
                  <div className="bg-blue-500/10 border border-blue-500/25 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-blue-400 uppercase tracking-wider font-medium mb-1">Opening Question</p>
                    <p className="text-sm text-blue-100 leading-relaxed italic">{top10.opening_question}</p>
                  </div>
                )}

                {/* Data quality note */}
                {top10.data_quality_note && (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-amber-400 uppercase tracking-wider font-medium mb-1">Data Quality Note</p>
                    <p className="text-xs text-amber-200 leading-relaxed">{top10.data_quality_note}</p>
                  </div>
                )}

                {/* Items */}
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                    {top10.item_count} Key Items ({top10.items.filter(i => i.is_essay_anchor).length} essay anchors)
                  </p>
                  <div className="space-y-3">
                    {top10.items.map(item => (
                      <div
                        key={item.rank}
                        className={`rounded-xl border px-4 py-3 space-y-2 ${
                          item.is_essay_anchor
                            ? 'bg-violet-500/5 border-violet-500/25'
                            : 'bg-slate-700/20 border-slate-700/40'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5 flex-shrink-0">#{item.rank}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white">{item.label}</span>
                              {item.is_essay_anchor && (
                                <span className="px-2 py-0.5 text-[10px] rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">Essay anchor</span>
                              )}
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-700 text-slate-400 border border-slate-600">
                                {item.source}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 italic leading-relaxed pl-5">{item.evidence}</p>
                        <p className="text-xs text-slate-400 leading-relaxed pl-5">
                          <span className="text-slate-500 font-medium">Tension: </span>{item.tension}
                        </p>
                        {item._caveat && (
                          <p className="text-xs text-amber-400/80 leading-relaxed pl-5">⚠ {item._caveat}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assignments to redo */}
                {top10.assignments_to_redo?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Exercises to Revisit</p>
                    <div className="space-y-3">
                      {top10.assignments_to_redo.map((a, i) => (
                        <div key={i} className="bg-slate-700/20 border border-slate-700/40 rounded-xl px-4 py-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{a.exercise_name}</span>
                            <span className={`px-2 py-0.5 text-[10px] rounded-full border ${
                              a.priority === 'high'
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}>{a.priority}</span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{a.why_promising}</p>
                          {a.coaching_asks?.length > 0 && (
                            <ul className="space-y-1 pl-3">
                              {a.coaching_asks.map((ask, j) => (
                                <li key={j} className="text-xs text-slate-300 leading-relaxed before:content-['→'] before:text-violet-400 before:mr-1.5">{ask}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── COMMONAPP ── */}
            {activeTab === 'commonapp' && ca && (
              <>
                {ca.data_integrity_note && (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-amber-400 uppercase tracking-wider font-medium mb-1">Data Integrity Note</p>
                    <p className="text-xs text-amber-200 leading-relaxed">{ca.data_integrity_note}</p>
                  </div>
                )}

                {ca.concepts?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Essay Concepts</p>
                    <div className="space-y-3">
                      {ca.concepts.map(c => (
                        <div key={c.rank} className="bg-slate-700/20 border border-slate-700/40 rounded-xl px-4 py-3 space-y-2">
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white flex-1">{c.label}</span>
                            {readinessBadge(c.readiness)}
                          </div>
                          <p className="text-xs text-slate-400 italic leading-relaxed">{c.theme}</p>
                          {c.core_claim && (
                            <p className="text-xs text-violet-300 leading-relaxed">
                              <span className="text-slate-500 not-italic font-medium">Core claim: </span>
                              &ldquo;{c.core_claim}&rdquo;
                            </p>
                          )}
                          {c.story_structure?.structure_note && (
                            <p className="text-xs text-slate-400 leading-relaxed">
                              <span className="text-slate-500 font-medium">Story: </span>
                              {c.story_structure.structure_note}
                            </p>
                          )}
                          {c.viability_note && (
                            <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-700/40 pt-2 mt-2">{c.viability_note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ca.triage_note && (
                  <div className="bg-slate-700/30 border border-slate-600/40 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">Triage Note</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{ca.triage_note}</p>
                  </div>
                )}

                {ca.student_facing_summary && (
                  <div className="bg-teal-500/10 border border-teal-500/25 rounded-xl px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-teal-400 uppercase tracking-wider font-medium">Student-Facing Summary</p>
                      <CopyButton text={summaryText(ca.student_facing_summary)} />
                    </div>
                    <p className="text-xs text-teal-100 leading-relaxed whitespace-pre-wrap">{ca.student_facing_summary}</p>
                  </div>
                )}
              </>
            )}

            {/* ── UC PIQs ── */}
            {activeTab === 'uc_piqs' && piqs && (
              <>
                {piqs.data_integrity_flag && (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-amber-400 uppercase tracking-wider font-medium mb-1">Data Integrity Note</p>
                    <p className="text-xs text-amber-200 leading-relaxed">{piqs.data_integrity_flag}</p>
                  </div>
                )}

                {piqs.recommended_piqs?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Recommended PIQs</p>
                    <div className="space-y-3">
                      {piqs.recommended_piqs.map(piq => (
                        <div key={piq.piq_number} className="bg-slate-700/20 border border-slate-700/40 rounded-xl px-4 py-3 space-y-2">
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="px-2 py-0.5 text-[10px] rounded bg-slate-700 text-slate-300 font-mono border border-slate-600 flex-shrink-0">PIQ {piq.piq_number}</span>
                            <span className="text-sm font-semibold text-white flex-1">{piq.topic_label}</span>
                            {readinessBadge(piq.readiness)}
                          </div>
                          <p className="text-[10px] text-violet-300/80 italic">{piq.piq_keyword}</p>
                          <p className="text-xs text-slate-300 leading-relaxed">{piq.why_this_student}</p>
                          {piq.concrete_example && (
                            <p className="text-xs text-slate-400 leading-relaxed">
                              <span className="text-slate-500 font-medium">Example needed: </span>{piq.concrete_example}
                            </p>
                          )}
                          {piq.drift_risk && (
                            <p className="text-xs text-rose-400/80 leading-relaxed">
                              <span className="font-medium">Drift risk: </span>{piq.drift_risk}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {piqs.diversity_check && (
                  <div className="bg-slate-700/30 border border-slate-600/40 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">Diversity Check</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{piqs.diversity_check}</p>
                  </div>
                )}

                {piqs.triage_note && (
                  <div className="bg-slate-700/30 border border-slate-600/40 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">Triage Note</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{piqs.triage_note}</p>
                  </div>
                )}

                {piqs.student_facing_summary && (
                  <div className="bg-teal-500/10 border border-teal-500/25 rounded-xl px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-teal-400 uppercase tracking-wider font-medium">Student-Facing Summary</p>
                      <CopyButton text={summaryText(piqs.student_facing_summary)} />
                    </div>
                    <p className="text-xs text-teal-100 leading-relaxed whitespace-pre-wrap">{summaryText(piqs.student_facing_summary)}</p>
                  </div>
                )}
              </>
            )}

            {/* ── WHY MAJOR ── */}
            {activeTab === 'why_major' && wm && (
              <>
                {wm.major_mismatch_flag && (
                  <div className="bg-orange-500/10 border border-orange-500/25 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-orange-400 uppercase tracking-wider font-medium mb-1">Major Alignment Note</p>
                    <p className="text-xs text-orange-200 leading-relaxed">{wm.major_mismatch_flag}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/20 border border-slate-700/40 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Intended Major</p>
                    <p className="text-sm text-white">{wm.intended_major || '—'}</p>
                  </div>
                  <div className="bg-slate-700/20 border border-slate-700/40 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Readiness</p>
                    <div className="mt-1">{readinessBadge(wm.readiness)}</div>
                  </div>
                </div>

                {wm.origin_moment && (
                  <div className="bg-slate-700/20 border border-slate-700/40 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Origin Moment</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        wm.origin_moment.quality === 'missing'
                          ? 'bg-rose-500/20 text-rose-400'
                          : wm.origin_moment.quality === 'partial'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>{wm.origin_moment.quality}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{wm.origin_moment.description}</p>
                  </div>
                )}

                {wm.intellectual_hook && (
                  <div className="bg-slate-700/20 border border-slate-700/40 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Intellectual Hook</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        wm.intellectual_hook.quality === 'missing'
                          ? 'bg-rose-500/20 text-rose-400'
                          : wm.intellectual_hook.quality === 'partial'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>{wm.intellectual_hook.quality}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{wm.intellectual_hook.description}</p>
                  </div>
                )}

                {wm.development_arc && wm.development_arc.length > 0 && (
                  <div className="bg-slate-700/20 border border-slate-700/40 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Development Arc</p>
                    <ul className="space-y-1.5">
                      {wm.development_arc.map((item, i) => (
                        <li key={i} className="text-xs text-slate-300 leading-relaxed before:content-['·'] before:text-slate-500 before:mr-2">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(wm.goals_connection || wm.drift_risk || wm.uc_flag) && (
                  <div className="space-y-2">
                    {wm.goals_connection && (
                      <div className="bg-slate-700/20 border border-slate-700/40 rounded-xl px-4 py-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Goals Connection</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{wm.goals_connection}</p>
                      </div>
                    )}
                    {wm.drift_risk && (
                      <div className="bg-slate-700/20 border border-slate-700/40 rounded-xl px-4 py-3">
                        <p className="text-[10px] text-rose-400/70 uppercase tracking-wider mb-1">Drift Risk</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{wm.drift_risk}</p>
                      </div>
                    )}
                    {wm.uc_flag && (
                      <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                        <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">UC Flag</p>
                        <p className="text-xs text-amber-200 leading-relaxed">{wm.uc_flag}</p>
                      </div>
                    )}
                  </div>
                )}

                {wm.triage_note && (
                  <div className="bg-slate-700/30 border border-slate-600/40 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">Triage Note</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{wm.triage_note}</p>
                  </div>
                )}

                {wm.student_facing_summary && (
                  <div className="bg-teal-500/10 border border-teal-500/25 rounded-xl px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-teal-400 uppercase tracking-wider font-medium">Student-Facing Summary</p>
                      <CopyButton text={wm.student_facing_summary} />
                    </div>
                    <p className="text-xs text-teal-100 leading-relaxed whitespace-pre-wrap">{wm.student_facing_summary}</p>
                  </div>
                )}
              </>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

// ── Section options — filtered by track + enabled modules ─────────────────────
// Always in canonical order: SD → WP → CommonApp → UC PIQs → Why Major → Why College
// 'foundation' track = long-form SD + WP only
// 'essay_prep' track = all sections (SD + WP + essay sections, same order)

const ALL_SECTION_OPTIONS = [
  { key: 'self_discovery',   label: 'Self-Discovery',        group: 'foundation' as const, module: 'selfDiscovery' as const },
  { key: 'writing_practice', label: 'Writing Practice',      group: 'foundation' as const, module: 'writingPractice' as const },
  { key: 'commonapp',        label: 'CommonApp Essay',        group: 'essay_prep' as const, module: 'commonApp' as const },
  { key: 'uc_piqs',          label: 'UC Personal Insight',   group: 'essay_prep' as const, module: 'ucPiqs' as const },
  { key: 'why_major',        label: 'Why Major',              group: 'essay_prep' as const, module: 'whyEssays' as const },
  { key: 'why_college',      label: 'Why College',            group: 'essay_prep' as const, module: 'whyEssays' as const },
]

function getSectionOptions(
  track: 'long_form' | 'sprint' | null,
  modules: EnabledModules,
  hasEssayModules: boolean,
) {
  if (!hasEssayModules || !track || track === 'long_form') {
    // Foundation track (or no essay modules): SD + WP only
    return ALL_SECTION_OPTIONS.filter(s => s.group === 'foundation' && modules[s.module])
  }
  // Essay Prep track: all sections in canonical order, filtered by enabled modules
  return ALL_SECTION_OPTIONS.filter(s => modules[s.module])
}

// ── StudentAssignmentPanel ────────────────────────────────────────────────────

function StudentAssignmentPanel({
  student,
  readOnly,
  onBack,
  onCountChanged,
  enabledModules,
  onTrackChange,
}: {
  student: Student
  readOnly: boolean
  onBack: () => void
  onCountChanged: (studentId: number, total: number, submitted: number) => void
  enabledModules: EnabledModules
  onTrackChange: (studentId: number, track: 'long_form' | 'sprint' | null) => void
}) {
  const { getToken } = useAuth()
  const [assignments, setAssignments] = useState<WritingAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [assignPanel, setAssignPanel] = useState<{ sectionKey: string; sectionLabel: string } | null>(null)
  const [reviewAssignment, setReviewAssignment] = useState<WritingAssignment | null>(null)
  const [track, setTrack] = useState<'long_form' | 'sprint' | null>(student.writing_track)
  const [savingTrack, setSavingTrack] = useState(false)
  const [assessmentCompleted, setAssessmentCompleted] = useState<boolean | null>(null)
  // Per-student allowed section keys — fetched from backend which applies per-student flags
  const [allowedSectionKeys, setAllowedSectionKeys] = useState<Set<string> | null>(null)
  const [unassigningRowId, setUnassigningRowId] = useState<number | null>(null)
  const [unassignRowWarning, setUnassignRowWarning] = useState<number | null>(null)

  // Essay Plan state
  const [essayPlan, setEssayPlan] = useState<EssayPlanSections>({})
  const [essayPlanGeneratedAt, setEssayPlanGeneratedAt] = useState<string | null>(null)
  const [essayPlanGenerating, setEssayPlanGenerating] = useState(false)
  const [essayPlanStatus, setEssayPlanStatus] = useState('')
  const [essayPlanStartedAt, setEssayPlanStartedAt] = useState<string | null>(null)
  const [essayPlanNotReady, setEssayPlanNotReady] = useState(false)
  const [showEssayPlan, setShowEssayPlan] = useState(false)

  // Derive per-student enabledModules by intersecting counselor modules with student's allowed sections
  const studentModules: EnabledModules = allowedSectionKeys === null ? enabledModules : {
    selfDiscovery:   enabledModules.selfDiscovery   && allowedSectionKeys.has('self_discovery'),
    writingPractice: enabledModules.writingPractice && allowedSectionKeys.has('writing_practice'),
    commonApp:       enabledModules.commonApp       && allowedSectionKeys.has('commonapp'),
    ucPiqs:          enabledModules.ucPiqs          && allowedSectionKeys.has('uc_piqs'),
    whyEssays:       enabledModules.whyEssays       && (allowedSectionKeys.has('why_major') || allowedSectionKeys.has('why_college')),
    essayHub:        enabledModules.essayHub,
  }

  const hasEssayModules = studentModules.commonApp || studentModules.ucPiqs || studentModules.whyEssays
  // Essay Prep track button only shows if this student has essay modules
  const studentHasEssayModules = hasEssayModules

  const saveTrack = async (newTrack: 'long_form' | 'sprint' | null) => {
    setSavingTrack(true)
    setTrack(newTrack)
    try {
      const tok = await getToken()
      if (!tok) return
      await fetch(`${API}/writing/students/${student.id}/track`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ writing_track: newTrack }),
      })
      onTrackChange(student.id, newTrack)
    } finally {
      setSavingTrack(false)
    }
  }

  const sectionOptions = getSectionOptions(track, studentModules, hasEssayModules)

  const loadData = useCallback(() => {
    setLoading(true)
    getToken().then(tok => {
      if (!tok) { setLoading(false); return }
      // Fetch assignments and student's allowed sections in parallel
      Promise.all([
        fetch(`${API}/writing/assignments?student_id=${student.id}`, {
          headers: { Authorization: `Bearer ${tok}` },
        }).then(r => r.json()),
        fetch(`${API}/writing/sections?student_id=${student.id}`, {
          headers: { Authorization: `Bearer ${tok}` },
        }).then(r => r.json()),
      ])
        .then(([assignData, sectionData]) => {
          const items: WritingAssignment[] = assignData.assignments || []
          setAssignments(items)
          setReviewAssignment(prev => prev ? (items.find(a => a.id === prev.id) ?? prev) : null)
          setLoading(false)
          onCountChanged(
            student.id,
            items.length,
            items.filter(a => a.status === 'submitted').length,
          )
          // Build set of section keys this student is allowed to access
          const keys = new Set<string>(
            (sectionData.sections || []).map((s: { key: string }) => s.key)
          )
          setAllowedSectionKeys(keys)
        })
        .catch(() => setLoading(false))
    })
  }, [student.id, getToken, onCountChanged])

  useEffect(() => { loadData() }, [loadData])

  const unassignAssignment = async (assignmentId: number, force = false) => {
    setUnassigningRowId(assignmentId)
    try {
      const tok = await getToken()
      if (!tok) return
      const res = await fetch(`${API}/writing/assignments/${assignmentId}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.ok) {
        const updated = assignments.filter(a => a.id !== assignmentId)
        setAssignments(updated)
        setUnassignRowWarning(null)
        onCountChanged(student.id, updated.length, updated.filter(a => a.status === 'submitted').length)
      } else if (res.status === 409) {
        setUnassignRowWarning(assignmentId)
      }
    } finally {
      setUnassigningRowId(null)
    }
  }

  // Fetch existing essay plan for this student
  useEffect(() => {
    if (readOnly || !enabledModules.selfDiscovery) return
    getToken().then(tok => {
      if (!tok) return
      // Clear stale plan immediately before fetching for the new student
      setEssayPlan({})
      setEssayPlanGeneratedAt(null)
      fetch(`${API}/writing/students/${student.id}/essay-plan`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(async r => {
        if (r.status === 200) {
          const data = await r.json()
          setEssayPlan(data.sections || {})
          setEssayPlanGeneratedAt(data.generated_at || null)
        }
        // 404 = no plan yet; state already cleared above
      }).catch(() => {})
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, readOnly, enabledModules.selfDiscovery])

  const generateEssayPlan = useCallback(async () => {
    setEssayPlan({})
    setEssayPlanGeneratedAt(null)
    setEssayPlanStartedAt(null)
    setEssayPlanGenerating(true)
    setEssayPlanStatus('')
    try {
      const tok = await getToken()
      if (!tok) { setEssayPlanGenerating(false); return }
      const res = await fetch(`${API}/writing/students/${student.id}/essay-plan/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) { setEssayPlanGenerating(false); return }
      const data = await res.json()
      setEssayPlanStartedAt(data.started_at || new Date().toISOString())
      // Backend returns immediately — generation runs in background.
    } catch {
      setEssayPlanGenerating(false)
    }
  }, [student.id, getToken])

  const checkEssayPlanReady = useCallback(async () => {
    const tok = await getToken()
    if (!tok) return
    const res = await fetch(`${API}/writing/students/${student.id}/essay-plan`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (res.status === 200) {
      const data = await res.json()
      const generatedAt = data.generated_at || null
      // Only accept the plan if it was generated after we started this generation run.
      // This prevents showing a stale cached plan from a previous run.
      if (essayPlanStartedAt && generatedAt && new Date(generatedAt) > new Date(essayPlanStartedAt)) {
        setEssayPlan(data.sections || {})
        setEssayPlanGeneratedAt(generatedAt)
        setEssayPlanGenerating(false)
        setEssayPlanStartedAt(null)
        setEssayPlanNotReady(false)
      } else if (!essayPlanStartedAt) {
        // No started_at means we're loading an existing plan (page load), not polling
        setEssayPlan(data.sections || {})
        setEssayPlanGeneratedAt(generatedAt)
        setEssayPlanGenerating(false)
      } else {
        // Plan exists but predates this run — still generating
        setEssayPlanNotReady(true)
        setTimeout(() => setEssayPlanNotReady(false), 4000)
      }
    }
  }, [student.id, getToken, essayPlanStartedAt])

  // Fetch personality assessment status for this student
  useEffect(() => {
    if (!enabledModules.selfDiscovery) return
    getToken().then(tok => {
      if (!tok) return
      fetch(`${API}/writing/personality-assessment?student_id=${student.id}`, {
        headers: { Authorization: `Bearer ${tok}` },
      }).then(r => setAssessmentCompleted(r.status === 200))
        .catch(() => setAssessmentCompleted(false))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, enabledModules.selfDiscovery])

  const studentName = student.full_name || student.email || `Student ${student.id}`
  const submittedCount = assignments.filter(a => a.status === 'submitted').length

  // Group by section, preserving encounter order
  const sectionOrder: string[] = []
  const sectionMap: Record<string, { title: string; items: WritingAssignment[] }> = {}
  for (const a of assignments) {
    if (!sectionMap[a.section_key]) {
      sectionMap[a.section_key] = { title: a.section_title, items: [] }
      sectionOrder.push(a.section_key)
    }
    sectionMap[a.section_key].items.push(a)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Student header */}
      <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-3 flex-shrink-0">
        {/* Back button — mobile only */}
        <button
          onClick={onBack}
          className="md:hidden text-slate-400 hover:text-white text-sm flex-shrink-0"
        >
          ←
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white truncate">{studentName}</span>
            {submittedCount > 0 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                {submittedCount} awaiting review
              </span>
            )}
          </div>
          {student.email && student.full_name && (
            <p className="text-xs text-slate-500 truncate">{student.email}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Track chooser — only for coaches when this student has essay modules */}
          {!readOnly && studentHasEssayModules && (
            <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden text-[10px] font-medium">
              <button
                onClick={() => saveTrack('long_form')}
                disabled={savingTrack}
                className={`px-2.5 py-1.5 transition-all ${
                  track === 'long_form'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Foundation
              </button>
              <button
                onClick={() => saveTrack('sprint')}
                disabled={savingTrack}
                className={`px-2.5 py-1.5 transition-all border-l border-slate-700 ${
                  track === 'sprint'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                Essay Prep
              </button>
            </div>
          )}
          {!readOnly && (
            <Link
              href={`/writing?for=${student.id}&from=writing`}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors whitespace-nowrap"
            >
              View full hub →
            </Link>
          )}
        </div>
      </div>

      {/* Parent privacy banner */}
      {readOnly && (
        <div className="mx-5 mt-4 px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-slate-400 leading-relaxed">
          Here you can see your student&rsquo;s progress. We keep their writing private so they can
          share what&rsquo;s really happening for them — students open up more when they know this is
          their space.
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-5 space-y-6">

            {/* Personality Assessment status — shown when self-discovery is enabled */}
            {enabledModules.selfDiscovery && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                  Self-Discovery
                </h3>
                <a
                  href={`/writing?for=${student.id}&from=writing#assessment`}
                  className="flex items-center justify-between gap-3 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base shrink-0">🧠</span>
                    <div className="min-w-0">
                      <p className="text-sm text-white">Personality Assessment</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {assessmentCompleted === null
                          ? 'Loading…'
                          : assessmentCompleted
                          ? '✓ Completed — click to view results'
                          : 'Not yet completed'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-violet-400 group-hover:text-violet-300 shrink-0">
                    View →
                  </span>
                </a>
              </div>
            )}

            {/* Assigned sections */}
            {sectionOrder.map(sKey => {
              const sec = sectionMap[sKey]
              return (
                <div key={sKey}>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                    {sec.title}
                  </h3>
                  <div className="space-y-2">
                    {sec.items.map(a => (
                      <div
                        key={a.id}
                        className="bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white leading-tight">{a.exercise_title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{a.unit_title}</p>
                          {!readOnly && a.note_to_student && (
                            <p className="text-xs text-violet-400/70 mt-1 line-clamp-1 italic">
                              {a.note_to_student}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <StatusBadge status={a.status} />
                          {/* Coach review/view button — always shown for all statuses */}
                          {!readOnly && (
                            <button
                              onClick={() => setReviewAssignment(a)}
                              className="text-xs text-violet-400 hover:text-violet-300 transition-colors px-2 py-1 rounded-lg hover:bg-violet-500/10"
                            >
                              {a.status === 'submitted' ? 'Review' : 'View'}
                            </button>
                          )}
                          {/* Unassign — shown for unreviewed assignments only */}
                          {!readOnly && a.status !== 'reviewed' && (
                            <div className="flex flex-col items-end gap-0.5">
                              <button
                                onClick={() => unassignAssignment(a.id)}
                                disabled={unassigningRowId === a.id}
                                className="text-xs text-slate-600 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                              >
                                {unassigningRowId === a.id ? '…' : 'Unassign'}
                              </button>
                              {unassignRowWarning === a.id && (
                                <div className="text-[10px] text-amber-400 text-right leading-relaxed">
                                  Student submitted work.{' '}
                                  <button onClick={() => unassignAssignment(a.id, true)} className="underline">Unassign anyway</button>
                                  {' · '}
                                  <button onClick={() => setUnassignRowWarning(null)} className="underline text-slate-500">Cancel</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Empty state */}
            {assignments.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-slate-500 text-sm">No exercises assigned yet.</p>
                {!readOnly && (
                  <p className="text-slate-600 text-xs mt-1">
                    Use the buttons below to assign exercises for this student.
                  </p>
                )}
              </div>
            )}

            {/* Assign section — coach only */}
            {!readOnly && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                  Assign Exercise
                </h3>
                <div className="flex flex-col gap-2">
                  {sectionOptions.map((s, i) => {
                    // Visual separator before essay sections in Essay Prep mode
                    const isFirstEssay = track === 'sprint' && s.group === 'essay_prep' &&
                      (i === 0 || sectionOptions[i - 1].group !== 'essay_prep')
                    return (
                      <div key={s.key}>
                        {isFirstEssay && (
                          <p className="text-[10px] text-slate-600 uppercase tracking-wider mt-1 mb-1">
                            Essay sections
                          </p>
                        )}
                        <button
                          onClick={() => setAssignPanel({ sectionKey: s.key, sectionLabel: s.label })}
                          className="w-full text-xs px-3 py-2 bg-slate-800/60 border border-slate-700/40 rounded-lg text-slate-300 hover:text-white hover:border-violet-500/40 hover:bg-violet-500/10 transition-all text-left"
                        >
                          + {s.label}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Essay Plan — counselor only, when self-discovery is enabled */}
            {!readOnly && enabledModules.selfDiscovery && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                  Essay Plan
                </h3>
                <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">AI Essay Analysis</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {essayPlanGeneratedAt
                          ? `Generated ${new Date(essayPlanGeneratedAt).toLocaleDateString()}`
                          : 'Analyzes writing responses, personality, and activities to surface essay anchors and coaching priorities.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {essayPlanGeneratedAt && (
                        <button
                          onClick={() => setShowEssayPlan(true)}
                          className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                        >
                          View Plan
                        </button>
                      )}
                      {!essayPlanGenerating && (
                        <button
                          onClick={generateEssayPlan}
                          className="text-xs px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 rounded-lg border border-violet-600/30 transition-all"
                        >
                          {essayPlanGeneratedAt ? '↺ Regenerate' : '✦ Generate'}
                        </button>
                      )}
                    </div>
                  </div>
                  {essayPlanGenerating && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        <p className="text-xs text-violet-300">Generating in background — this takes a few minutes. Feel free to do something else.</p>
                      </div>
                      <button
                        onClick={checkEssayPlanReady}
                        className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-all flex-shrink-0"
                      >
                        Check if ready
                      </button>
                    </div>
                  )}
                  {essayPlanNotReady && (
                    <p className="text-xs text-slate-400 pt-1">Not ready yet — try again in a few minutes.</p>
                  )}
                </div>
              </div>
            )}

            {/* Essay Prompts & Drafts — all roles.
                Always show for readOnly (parents) since they have no other path to essay status.
                For counselors/others, gate on essayHub module flag. */}
            {(readOnly || enabledModules.essayHub) && (
              <div className="pt-2 border-t border-slate-700/50">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Essays</p>
                <a
                  href={`/essays?for=${student.id}`}
                  className="flex items-center justify-between gap-4 bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
                >
                  <div>
                    <p className="text-sm font-medium text-white">Essay Prompts &amp; Drafts</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {readOnly ? 'See essay requirements and track draft progress' : 'Browse prompts and track drafts for this student'}
                    </p>
                  </div>
                  <span className="shrink-0 px-3 py-1.5 text-xs bg-violet-600 group-hover:bg-violet-500 text-white rounded-lg transition-colors">
                    Open →
                  </span>
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assign panel modal */}
      {assignPanel && (
        <AssignPanel
          sectionKey={assignPanel.sectionKey}
          sectionLabel={assignPanel.sectionLabel}
          studentId={student.id}
          track={track}
          onAssigned={() => { loadData() }}
          onClose={() => setAssignPanel(null)}
        />
      )}

      {/* Review panel modal */}
      {reviewAssignment && (
        <ReviewPanel
          assignment={reviewAssignment}
          onClose={() => setReviewAssignment(null)}
          onReviewed={loadData}
        />
      )}

      {/* Essay Plan overlay */}
      {showEssayPlan && (
        <EssayPlanPanel
          studentName={studentName}
          sections={essayPlan}
          generatedAt={essayPlanGeneratedAt}
          generating={essayPlanGenerating}
          statusMsg={essayPlanStatus}
          onGenerate={generateEssayPlan}
          onClose={() => setShowEssayPlan(false)}
        />
      )}
    </div>
  )
}

// ── Main WritingCoachView ─────────────────────────────────────────────────────

export function WritingCoachView({
  readOnly = false,
  enabledModules = { selfDiscovery: true, writingPractice: true, commonApp: false, ucPiqs: false, whyEssays: false },
}: {
  token?: string   // kept for API compatibility; fresh tokens fetched internally
  readOnly?: boolean
  enabledModules?: EnabledModules
}) {
  const { getToken } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [assignmentCounts, setAssignmentCounts] = useState<Record<number, { total: number; submitted: number }>>({})
  const [search, setSearch] = useState('')

  // Load student list
  useEffect(() => {
    getToken().then(tok => {
      if (!tok) { setLoadingStudents(false); return }
      fetch(`${API}/my-students`, { headers: { Authorization: `Bearer ${tok}` } })
        .then(r => r.json())
        .then(data => {
          const list: Student[] = Array.isArray(data) ? data : (data.students || [])
          setStudents(list)
          setLoadingStudents(false)
        })
        .catch(() => setLoadingStudents(false))
    })
  }, [getToken])

  // Assignment counts are populated lazily via onCountChanged when each student
  // is selected — do NOT batch-load for all students on mount. Firing one request
  // per student simultaneously exhausts the DB connection pool and makes the page
  // unresponsive. Counts will appear in the sidebar after each student is visited.

  const studentName = (s: Student) => s.full_name || s.email || `Student ${s.id}`
  const totalSubmitted = Object.values(assignmentCounts).reduce((sum, c) => sum + c.submitted, 0)

  const refreshStudentCount = useCallback((studentId: number, total: number, submitted: number) => {
    setAssignmentCounts(prev => ({ ...prev, [studentId]: { total, submitted } }))
  }, [])

  const handleTrackChange = useCallback((studentId: number, track: 'long_form' | 'sprint' | null) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, writing_track: track } : s))
  }, [])

  const filteredStudents = search.trim()
    ? students.filter(s => {
        const q = search.toLowerCase()
        return (
          s.full_name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q)
        )
      })
    : students

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Student list — left panel */}
      <aside
        className={[
          'flex-col border-r border-slate-800 bg-slate-900',
          'w-full md:w-64 flex-shrink-0',
          // On mobile: hide panel when student selected, show otherwise
          selectedStudent ? 'hidden md:flex' : 'flex',
        ].join(' ')}
      >
        {/* Panel header */}
        <div className="px-3 py-2.5 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Students</p>
            {totalSubmitted > 0 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                {totalSubmitted} to review
              </span>
            )}
          </div>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingStudents ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-slate-500 text-sm">No students yet.</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-slate-500 text-sm">No students match &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            <div className="py-2">
              {filteredStudents.map(s => {
                const counts = assignmentCounts[s.id]
                const isSelected = selectedStudent?.id === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className={[
                      'w-full text-left px-4 py-3 transition-all',
                      isSelected
                        ? 'bg-violet-600/15 border-r-2 border-violet-500'
                        : 'hover:bg-white/5',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate leading-tight">{studentName(s)}</p>
                        {s.full_name && s.email && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{s.email}</p>
                        )}
                      </div>
                      {counts?.submitted > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                          {counts.submitted}
                        </span>
                      )}
                    </div>
                    {counts !== undefined && (
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {counts.total === 0
                          ? 'No exercises assigned'
                          : `${counts.total} exercise${counts.total === 1 ? '' : 's'} assigned`}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Right panel */}
      <div
        className={[
          'flex-1 flex-col overflow-hidden',
          selectedStudent ? 'flex' : 'hidden md:flex',
        ].join(' ')}
      >
        {selectedStudent ? (
          <StudentAssignmentPanel
            student={selectedStudent}
            readOnly={readOnly}
            onBack={() => setSelectedStudent(null)}
            onCountChanged={refreshStudentCount}
            enabledModules={enabledModules}
            onTrackChange={handleTrackChange}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <p className="text-slate-400 text-sm">
                Select a student to view their writing assignments.
              </p>
              {!readOnly && (
                <p className="text-slate-600 text-xs mt-1">
                  You can assign exercises, review submissions, and leave feedback.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
