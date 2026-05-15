'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'

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
  exercise_type: string
  word_limit: number | null
  time_limit_minutes: number | null
  is_timed: boolean
  unit_title: string
  section_key: string
  section_title: string
  latest_revision: number | null
  last_submitted_at: string | null
}

interface AssignmentResponse {
  id: number
  body: string
  revision_number: number
  created_at: string
}

interface LibraryExercise {
  id: number
  title: string
  prompt_text: string | null
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
  const [previouslyAssigned, setPreviouslyAssigned] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [assigning, setAssigning] = useState<number | null>(null)
  const [newlyAssigned, setNewlyAssigned] = useState<Set<number>>(new Set())

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
          const ids = new Set<number>(
            (assignData.assignments || []).map((a: WritingAssignment) => a.exercise_id)
          )
          setPreviouslyAssigned(ids)
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
        setNewlyAssigned(s => { const n = new Set(s); n.add(exerciseId); return n })
        onAssigned()
      }
    } finally {
      setAssigning(null)
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
  const isAssigned = (id: number) => previouslyAssigned.has(id) || newlyAssigned.has(id)
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
                                ? 'bg-slate-800/30 border-slate-700/30 opacity-50'
                                : 'bg-slate-700/40 border-slate-600/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium leading-tight ${done ? 'text-slate-400' : 'text-white'}`}>
                                  {ex.title}
                                </p>
                                {ex.prompt_text && !done && (
                                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ex.prompt_text}</p>
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
                              <button
                                onClick={() => !done && assign(ex.id)}
                                disabled={done || assigning === ex.id}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  done
                                    ? 'bg-green-500/10 text-green-500/60 cursor-default'
                                    : 'bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50'
                                }`}
                              >
                                {done ? '✓' : assigning === ex.id ? '…' : 'Assign'}
                              </button>
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

  useEffect(() => {
    getToken().then(tok => {
      if (!tok) { setLoadingResponses(false); return }
      fetch(`${API}/writing/assignments/${assignment.id}/responses`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
        .then(r => r.json())
        .then(data => { setResponses(data.responses || []); setLoadingResponses(false) })
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

  const latestResponse = responses[responses.length - 1]

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

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Student response */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Student Response
            </p>
            {loadingResponses ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : latestResponse ? (
              <div className="bg-slate-700/30 rounded-xl border border-slate-600/40 p-4">
                <p className="text-xs text-slate-500 mb-2">
                  Revision {latestResponse.revision_number}
                  {' · '}
                  {new Date(latestResponse.created_at).toLocaleDateString()}
                  {responses.length > 1 && (
                    <span className="ml-2 text-slate-600">({responses.length} total revisions)</span>
                  )}
                </p>
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {latestResponse.body}
                </p>
              </div>
            ) : (
              <div className="bg-slate-700/20 rounded-xl border border-slate-700/30 p-6 text-center">
                <p className="text-slate-500 text-sm">No response submitted yet.</p>
              </div>
            )}
          </div>

          {/* Coach notes */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">
              Coach Notes{' '}
              <span className="text-slate-600 normal-case">(visible to student, not to parents)</span>
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

// ── Section options — filtered by track + enabled modules ─────────────────────

const ALL_SECTION_OPTIONS = [
  { key: 'self_discovery',   label: 'Self-Discovery',        track: 'long_form' as const, module: 'selfDiscovery' as const },
  { key: 'writing_practice', label: 'Writing Practice',      track: 'long_form' as const, module: 'writingPractice' as const },
  { key: 'commonapp',        label: 'CommonApp Essay',        track: 'sprint'    as const, module: 'commonApp' as const },
  { key: 'uc_piqs',          label: 'UC Personal Insight',   track: 'sprint'    as const, module: 'ucPiqs' as const },
  { key: 'why_major',        label: 'Why Major',              track: 'sprint'    as const, module: 'whyEssays' as const },
  { key: 'why_college',      label: 'Why College',            track: 'sprint'    as const, module: 'whyEssays' as const },
]

function getSectionOptions(
  track: 'long_form' | 'sprint' | null,
  modules: EnabledModules,
  hasEssayModules: boolean,
) {
  // No track set yet, or no essay modules — show SD + WP only
  if (!track || !hasEssayModules) {
    return ALL_SECTION_OPTIONS.filter(s => s.track === 'long_form' && modules[s.module])
  }
  if (track === 'long_form') {
    return ALL_SECTION_OPTIONS.filter(s => s.track === 'long_form' && modules[s.module])
  }
  // Sprint: essay sections first (enabled ones), then SD + WP collapsed at bottom
  const sprint = ALL_SECTION_OPTIONS.filter(s => s.track === 'sprint' && modules[s.module])
  const longForm = ALL_SECTION_OPTIONS.filter(s => s.track === 'long_form' && modules[s.module])
  return [...sprint, ...longForm]
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

  const hasEssayModules = enabledModules.commonApp || enabledModules.ucPiqs || enabledModules.whyEssays

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

  const sectionOptions = getSectionOptions(track, enabledModules, hasEssayModules)

  const loadData = useCallback(() => {
    setLoading(true)
    getToken().then(tok => {
      if (!tok) { setLoading(false); return }
      fetch(`${API}/writing/assignments?student_id=${student.id}`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
        .then(r => r.json())
        .then(data => {
          const items: WritingAssignment[] = data.assignments || []
          setAssignments(items)
          setLoading(false)
          onCountChanged(
            student.id,
            items.length,
            items.filter(a => a.status === 'submitted').length,
          )
        })
        .catch(() => setLoading(false))
    })
  }, [student.id, getToken, onCountChanged])

  useEffect(() => { loadData() }, [loadData])

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
          {/* Track chooser — only for coaches when essay modules are enabled */}
          {!readOnly && hasEssayModules && (
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
                Long-form
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
                Sprint
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
                          {a.note_to_student && (
                            <p className="text-xs text-violet-400/70 mt-1 line-clamp-1 italic">
                              {a.note_to_student}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <StatusBadge status={a.status} />
                          {/* Coach review/view button */}
                          {!readOnly && (a.status === 'submitted' || a.status === 'in_progress' || a.status === 'reviewed') && (
                            <button
                              onClick={() => setReviewAssignment(a)}
                              className="text-xs text-violet-400 hover:text-violet-300 transition-colors px-2 py-1 rounded-lg hover:bg-violet-500/10"
                            >
                              {a.status === 'submitted' ? 'Review' : 'View'}
                            </button>
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
                    // Visual separator before the long-form sections in sprint mode
                    const isFirstLongForm = track === 'sprint' && s.track === 'long_form' &&
                      (i === 0 || sectionOptions[i - 1].track !== 'long_form')
                    return (
                      <div key={s.key}>
                        {isFirstLongForm && (
                          <p className="text-[10px] text-slate-600 uppercase tracking-wider mt-1 mb-1">
                            Additional exercises
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
          onAssigned={() => { loadData(); setAssignPanel(null) }}
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

  // Load assignment counts (for sidebar badges)
  useEffect(() => {
    if (students.length === 0) return
    getToken().then(tok => {
      if (!tok) return
      const counts: Record<number, { total: number; submitted: number }> = {}
      Promise.allSettled(
        students.map(s =>
          fetch(`${API}/writing/assignments?student_id=${s.id}`, {
            headers: { Authorization: `Bearer ${tok}` },
          })
            .then(r => r.json())
            .then(data => {
              const items: WritingAssignment[] = data.assignments || []
              counts[s.id] = {
                total: items.length,
                submitted: items.filter(a => a.status === 'submitted').length,
              }
            })
            .catch(() => {})
        )
      ).then(() => setAssignmentCounts({ ...counts }))
    })
  }, [students, getToken])

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
