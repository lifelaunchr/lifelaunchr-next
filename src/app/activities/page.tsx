'use client'

import { useEffect, useState, Suspense } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Activity {
  id: number
  uc_category: string
  common_app_category?: string
  category?: string          // legacy
  role?: string
  organization?: string
  organization_description?: string
  description?: string
  grade_levels?: string
  hours_per_week?: number
  weeks_per_year?: number
  timing?: string
  is_current: boolean
  display_order: number
  // UC-specific
  eligibility_requirements?: string
  level_of_recognition?: string
  award_type?: string
  still_working?: boolean
  earnings_use?: string
  // CA-specific
  intend_to_continue?: boolean | null
  is_common_app_award?: boolean
}

type FormState = Omit<Activity, 'id' | 'display_order' | 'hours_per_week' | 'weeks_per_year'> & {
  hours_per_week: string
  weeks_per_year: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const UC_CATEGORIES = [
  'Award or Honor',
  'Educational preparation program',
  'Extracurricular activity',
  'Other coursework',
  'Volunteer/community service',
  'Work experience',
]

const CA_CATEGORIES = [
  'Academic',
  'Art',
  'Athletics: Club',
  'Athletics: JV/Varsity',
  'Career-Oriented',
  'Community Service (Volunteer)',
  'Computer/Technology',
  'Cultural',
  'Dance',
  'Debate/Speech',
  'Environmental',
  'Family Responsibilities',
  'Foreign Exchange',
  'Journalism/Publication',
  'Junior R.O.T.C.',
  'LGBT',
  'Music: Instrumental',
  'Music: Vocal',
  'Religious',
  'Research',
  'Robotics',
  'School Spirit',
  'Science/Math',
  'Student Gov./Politics',
  'Theater/Drama',
  'Work (paid)',
  'Other Club/Activity',
]

const RECOGNITION_LEVELS = [
  'School',
  'City / Community',
  'State',
  'Regional',
  'National',
  'International',
]

const TIMING_LABELS: Record<string, string> = {
  school_year: 'School Year',
  summer: 'Summer',
  year_round: 'Year-Round',
}

const BLANK: FormState = {
  uc_category: '',
  common_app_category: '',
  role: '',
  organization: '',
  organization_description: '',
  description: '',
  grade_levels: '',
  hours_per_week: '',
  weeks_per_year: '',
  timing: 'school_year',
  is_current: false,
  eligibility_requirements: '',
  level_of_recognition: '',
  award_type: '',
  still_working: false,
  earnings_use: '',
  intend_to_continue: null,
  is_common_app_award: false,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ucCategoryStyle(cat: string): { accent: string; bg: string; text: string; icon: string } {
  switch (cat) {
    case 'Award or Honor':                return { accent: '#f59e0b', bg: '#fffbeb', text: '#92400e', icon: '🏆' }
    case 'Educational preparation program': return { accent: '#0ea5e9', bg: '#f0f9ff', text: '#0c4a6e', icon: '📚' }
    case 'Extracurricular activity':       return { accent: '#6366f1', bg: '#eef2ff', text: '#3730a3', icon: '⭐' }
    case 'Other coursework':               return { accent: '#8b5cf6', bg: '#f5f3ff', text: '#4c1d95', icon: '📖' }
    case 'Volunteer/community service':    return { accent: '#14b8a6', bg: '#f0fdfa', text: '#134e4a', icon: '🤝' }
    case 'Work experience':               return { accent: '#f97316', bg: '#fff7ed', text: '#7c2d12', icon: '💼' }
    default:                               return { accent: '#6b7280', bg: '#f9fafb', text: '#374151', icon: '📌' }
  }
}

const GRADE_OPTIONS = ['9th', '10th', '11th', '12th', 'After 12th']

function GradeCheckboxes({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled?: boolean
}) {
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
  const toggle = (g: string) => {
    const next = selected.includes(g) ? selected.filter(x => x !== g) : [...selected, g]
    onChange(next.join(', '))
  }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {GRADE_OPTIONS.map(g => (
        <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: disabled ? 'default' : 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={selected.includes(g)}
            onChange={() => toggle(g)}
            disabled={disabled}
            style={{ width: 14, height: 14, accentColor: '#4f46e5' }}
          />
          <span style={{ fontSize: '0.8rem', color: '#374151' }}>{g}</span>
        </label>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function ActivitiesContent() {
  const { getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const searchParams = useSearchParams()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const forParam = searchParams.get('for')
  const forStudentId = forParam ? parseInt(forParam, 10) : null

  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [canWrite, setCanWrite] = useState(true)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>({ ...BLANK })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Drag-and-drop
  const [dragSrcIndex, setDragSrcIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!clerkUser) return
    const load = async () => {
      try {
        const token = await getToken()
        if (!token) { setError('Not signed in.'); setLoading(false); return }

        await fetch(`${apiUrl}/auth/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            clerk_user_id: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            full_name: clerkUser.fullName || clerkUser.firstName || '',
            account_type: 'student',
          }),
        })

        const usageRes = await fetch(`${apiUrl}/my-usage`, { headers: { Authorization: `Bearer ${token}` } })
        if (!usageRes.ok) { setError('Not signed in.'); setLoading(false); return }
        const usage = await usageRes.json()
        setMyUserId(usage.user_id)

        const targetId = forStudentId ?? usage.user_id

        if (forStudentId) {
          const sRes = await fetch(`${apiUrl}/my-students`, { headers: { Authorization: `Bearer ${token}` } })
          if (sRes.ok) {
            const students: Array<{ id: number; full_name: string; email: string }> = await sRes.json()
            const match = students.find(s => s.id === forStudentId)
            if (match) setStudentName(match.full_name || match.email)
          }
        }

        const profRes = await fetch(`${apiUrl}/profile/${targetId}`, { headers: { Authorization: `Bearer ${token}` } })
        if (profRes.ok) {
          const data = await profRes.json()
          setActivities(data.activities || [])
          if (typeof data.can_write === 'boolean') setCanWrite(data.can_write)
        }
      } catch { setError('Failed to load activities.') }
      finally { setLoading(false) }
    }
    load()
  }, [getToken, apiUrl, forStudentId, clerkUser])

  const targetId = forStudentId ?? myUserId

  // ── Modal helpers ───────────────────────────────────────────────────────────

  const pf = (updates: Partial<FormState>) => setForm(p => ({ ...p, ...updates }))

  const openAdd = () => {
    setEditingId(null); setForm({ ...BLANK }); setSaveError(null); setModalOpen(true)
  }

  const openEdit = (a: Activity) => {
    setEditingId(a.id)
    setForm({
      uc_category: a.uc_category || a.category || '',
      common_app_category: a.common_app_category || '',
      role: a.role || '',
      organization: a.organization || '',
      organization_description: a.organization_description || '',
      description: a.description || '',
      grade_levels: a.grade_levels || '',
      hours_per_week: a.hours_per_week != null ? String(a.hours_per_week) : '',
      weeks_per_year: a.weeks_per_year != null ? String(a.weeks_per_year) : '',
      timing: a.timing || 'school_year',
      is_current: a.is_current ?? false,
      eligibility_requirements: a.eligibility_requirements || '',
      level_of_recognition: a.level_of_recognition || '',
      award_type: a.award_type || '',
      still_working: a.still_working ?? false,
      earnings_use: a.earnings_use || '',
      intend_to_continue: a.intend_to_continue ?? null,
      is_common_app_award: a.is_common_app_award ?? false,
    })
    setSaveError(null); setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setEditingId(null) }

  const saveActivity = async () => {
    if (!targetId || !canWrite) return
    if (!form.uc_category.trim()) { setSaveError('Please select a UC Category.'); return }
    if (!form.organization?.trim() && !form.role?.trim()) {
      setSaveError('Please enter at least a name or role.'); return
    }
    setSaving(true); setSaveError(null)
    try {
      const token = await getToken()
      const payload = {
        uc_category: form.uc_category.trim(),
        common_app_category: form.common_app_category || null,
        category: form.uc_category.trim(),
        role: form.role?.trim() || null,
        organization: form.organization?.trim() || null,
        organization_description: form.organization_description?.trim() || null,
        description: form.description?.trim() || null,
        grade_levels: form.grade_levels?.trim() || null,
        hours_per_week: form.hours_per_week ? parseInt(form.hours_per_week as string) : null,
        weeks_per_year: form.weeks_per_year ? parseInt(form.weeks_per_year as string) : null,
        timing: form.timing,
        is_current: form.is_current,
        eligibility_requirements: form.eligibility_requirements?.trim() || null,
        level_of_recognition: form.level_of_recognition || null,
        award_type: form.award_type || null,
        still_working: form.still_working,
        earnings_use: form.earnings_use?.trim() || null,
        intend_to_continue: form.intend_to_continue,
        is_common_app_award: form.is_common_app_award,
      }
      const url = editingId
        ? `${apiUrl}/profile/activities/${editingId}`
        : `${apiUrl}/profile/${targetId}/activities`
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const saved = await res.json()
        setActivities(prev => editingId ? prev.map(a => a.id === editingId ? saved : a) : [...prev, saved])
        closeModal()
      } else {
        const body = await res.json().catch(() => ({}))
        setSaveError(body.detail || 'Save failed.')
      }
    } catch { setSaveError('Network error.') }
    finally { setSaving(false) }
  }

  const deleteActivity = async (id: number) => {
    if (!canWrite || !confirm('Remove this activity?')) return
    const token = await getToken()
    await fetch(`${apiUrl}/profile/activities/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setActivities(prev => prev.filter(a => a.id !== id))
  }

  // ── Drag-and-drop ───────────────────────────────────────────────────────────

  const reorder = async (next: Activity[]) => {
    setActivities(next)
    if (!targetId) return
    try {
      const token = await getToken()
      await fetch(`${apiUrl}/profile/${targetId}/activities/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: next.map(a => a.id) }),
      })
    } catch { /* optimistic */ }
  }

  const handleDragStart = (i: number) => setDragSrcIndex(i)
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIndex(i) }
  const handleDrop = (dropIdx: number) => {
    if (dragSrcIndex === null || dragSrcIndex === dropIdx) { setDragSrcIndex(null); setDragOverIndex(null); return }
    const next = [...activities]; const [moved] = next.splice(dragSrcIndex, 1); next.splice(dropIdx, 0, moved)
    setDragSrcIndex(null); setDragOverIndex(null); reorder(next)
  }
  const handleDragEnd = () => { setDragSrcIndex(null); setDragOverIndex(null) }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div style={centerStyle}>Loading…</div>
  if (error)   return <div style={{ ...centerStyle, color: '#ef4444' }}>{error}</div>

  const ucCat = form.uc_category
  const isAward    = ucCat === 'Award or Honor'
  const isEduProg  = ucCat === 'Educational preparation program'
  const isCourse   = ucCat === 'Other coursework'
  const isService  = ucCat === 'Volunteer/community service'
  const isWork     = ucCat === 'Work experience'
  const isExtra    = ucCat === 'Extracurricular activity'

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/chat" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>← Back to Soar</Link>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0c1b33' }}><span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr</span>
          </Link>
        </div>
        {canWrite && (
          <button onClick={openAdd} style={btnPrimary}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Add Activity
          </button>
        )}
      </header>

      {/* Body */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px' }}>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6 }}>
            {studentName ? `${studentName}'s Activities & Awards` : 'Activities & Awards'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
            {canWrite
              ? 'Enter everything in detail — no character limit here. Soar uses this to generate polished Common App and UC activity lists on demand.'
              : "Read-only view of this student's activities."}
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          {UC_CATEGORIES.map(c => {
            const s = ucCategoryStyle(c)
            return (
              <span key={c} style={{ background: s.bg, color: s.text, border: `1px solid ${s.accent}44`, borderRadius: 20, padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600 }}>
                {s.icon} {c}
              </span>
            )
          })}
        </div>

        {/* Cards */}
        {activities.length === 0 ? (
          <div style={{ background: '#fff', border: '2px dashed #e2e8f0', borderRadius: 16, padding: '56px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏆</div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#374151', marginBottom: 8 }}>No activities yet</p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
              Add your extracurriculars, awards, jobs, programs, and coursework. Be as detailed as possible — Soar will handle the formatting for Common App and UC.
            </p>
            {canWrite && <button onClick={openAdd} style={btnPrimary}>+ Add First Activity</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activities.map((a, index) => {
              const cs = ucCategoryStyle(a.uc_category || a.category || '')
              const isDragging = dragSrcIndex === index
              const isOver = dragOverIndex === index && dragSrcIndex !== null && dragSrcIndex !== index

              const displayName = a.organization || a.role || '(unnamed)'
              const roleLabel   = a.uc_category === 'Work experience' ? a.role : a.role

              return (
                <div key={a.id} draggable={canWrite}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={e => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    background: '#fff',
                    border: `1px solid ${isOver ? '#6366f1' : '#e8ecf3'}`,
                    borderLeft: `4px solid ${cs.accent}`,
                    borderRadius: 12,
                    padding: '16px 18px 16px 14px',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    opacity: isDragging ? 0.35 : 1,
                    transform: isOver ? 'translateY(-3px)' : 'none',
                    boxShadow: isOver ? `0 6px 20px rgba(99,102,241,0.15)` : '0 1px 4px rgba(0,0,0,0.05)',
                    transition: 'box-shadow 0.15s, transform 0.12s, border-color 0.15s',
                    cursor: canWrite ? 'grab' : 'default',
                  }}>

                  {canWrite && <div title="Drag to reorder" style={{ color: '#cbd5e1', fontSize: '1.15rem', marginTop: 16, flexShrink: 0, cursor: 'grab', userSelect: 'none' }}>⠿</div>}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Category row */}
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ background: cs.bg, color: cs.text, border: `1px solid ${cs.accent}55`, borderRadius: 20, padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                        {cs.icon} {a.uc_category || a.category}
                      </span>
                      {a.common_app_category && (
                        <span style={{ background: '#f0f4ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: 20, padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600 }}>
                          CA: {a.common_app_category}
                        </span>
                      )}
                      {a.is_common_app_award && (
                        <span style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde04755', borderRadius: 20, padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600 }}>
                          CA Honors ★
                        </span>
                      )}
                      {(a.is_current || a.still_working) && (
                        <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac55', borderRadius: 20, padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
                          {a.still_working ? 'Currently employed' : 'Current'}
                        </span>
                      )}
                      {a.level_of_recognition && (
                        <span style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #f59e0b55', borderRadius: 20, padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600 }}>
                          {a.level_of_recognition}
                        </span>
                      )}
                    </div>

                    {/* Name / role */}
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: 2 }}>{displayName}</p>
                    {roleLabel && roleLabel !== displayName && (
                      <p style={{ fontSize: '0.85rem', color: '#6366f1', marginBottom: 4, fontWeight: 600 }}>{roleLabel}</p>
                    )}

                    {/* Stats */}
                    {(a.grade_levels || a.hours_per_week || a.weeks_per_year) && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        {a.grade_levels && <Chip>🎓 {a.grade_levels}</Chip>}
                        {a.hours_per_week && <Chip>⏱ {a.hours_per_week} hrs/wk</Chip>}
                        {a.weeks_per_year && <Chip>📅 {a.weeks_per_year} wks/yr</Chip>}
                        {a.timing && a.timing !== 'school_year' && <Chip>{TIMING_LABELS[a.timing] ?? a.timing}</Chip>}
                      </div>
                    )}

                    {/* Description snippets */}
                    {a.organization_description && (
                      <p style={snippetStyle}><em>Org:</em> {a.organization_description}</p>
                    )}
                    {a.eligibility_requirements && (
                      <p style={snippetStyle}><em>Eligibility:</em> {a.eligibility_requirements}</p>
                    )}
                    {a.description && (
                      <p style={{ ...snippetStyle, borderTop: '1px solid #f1f3f7', paddingTop: 8, marginTop: 4 }}>{a.description}</p>
                    )}
                    {a.earnings_use && (
                      <p style={snippetStyle}><em>Earnings used for:</em> {a.earnings_use}</p>
                    )}
                  </div>

                  {canWrite && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, marginTop: 2 }}>
                      <button onClick={() => openEdit(a)} style={btnEdit}>Edit</button>
                      <button onClick={() => deleteActivity(a.id)} style={btnRemove}>Remove</button>
                    </div>
                  )}
                </div>
              )
            })}

            {canWrite && (
              <button onClick={openAdd}
                onMouseEnter={e => (e.currentTarget.style.background = '#eef2ff')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                style={{ background: '#fff', color: '#4f46e5', border: '2px dashed #c7d2fe', borderRadius: 12, padding: '14px', width: '100%', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}>
                + Add Another Activity or Award
              </button>
            )}
          </div>
        )}

        <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', marginTop: 32 }}>
          💡 Common App: up to 10 activities + 5 honors · UC: up to 20 entries total ·{' '}
          Ask Soar to generate your activity lists or resume anytime
        </p>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) closeModal() }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0c1b33' }}>
                {editingId ? 'Edit Entry' : 'Add Activity or Award'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* ── UC Category (required) ── */}
              <div>
                <label style={lbl}>UC Category *</label>
                <select value={form.uc_category} onChange={e => pf({ uc_category: e.target.value })} style={inp}>
                  <option value="">Choose UC category…</option>
                  {UC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* ── Common App Category ── */}
              <div>
                <label style={lbl}>Common App Category <span style={optional}>— choose if this activity appears on Common App</span></label>
                <select value={form.common_app_category || ''} onChange={e => pf({ common_app_category: e.target.value || '' })} style={inp}>
                  <option value="">None / Not applicable</option>
                  {CA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* ── Divider ── */}
              {ucCat && <div style={{ borderTop: '1px solid #e8ecf3' }} />}

              {/* ── AWARD OR HONOR ── */}
              {isAward && <>
                <Field label="Award Name *" hint="The full official name of the award">
                  <input value={form.organization || ''} onChange={e => pf({ organization: e.target.value })} placeholder="National Merit Scholar, AP Scholar with Distinction…" style={inp} />
                </Field>
                <TwoCol>
                  <Field label="Level of Recognition">
                    <select value={form.level_of_recognition || ''} onChange={e => pf({ level_of_recognition: e.target.value })} style={inp}>
                      <option value="">Choose…</option>
                      {RECOGNITION_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                  <Field label="Award Type">
                    <select value={form.award_type || ''} onChange={e => pf({ award_type: e.target.value })} style={inp}>
                      <option value="">Choose…</option>
                      <option value="Academic">Academic</option>
                      <option value="Non-academic">Non-academic</option>
                    </select>
                  </Field>
                </TwoCol>
                <Field label="Grade(s) received">
                  <GradeCheckboxes value={form.grade_levels || ''} onChange={v => pf({ grade_levels: v })} />
                </Field>
                <Field label="Eligibility requirements" hint="What are the criteria for this award?">
                  <textarea value={form.eligibility_requirements || ''} onChange={e => pf({ eligibility_requirements: e.target.value })} rows={2} placeholder="Open to students with 3.8+ GPA who scored in top 1% on PSAT…" style={{ ...inp, resize: 'vertical' }} />
                </Field>
                <Field label="What you did to earn it" hint="Be specific — judges, competitions, accomplishments">
                  <textarea value={form.description || ''} onChange={e => pf({ description: e.target.value })} rows={3} placeholder="Scored 1560 on PSAT, placed in top 1% nationally; completed online program and essay…" style={{ ...inp, resize: 'vertical' }} />
                </Field>
                <label style={checkLabel}>
                  <input type="checkbox" checked={form.is_common_app_award} onChange={e => pf({ is_common_app_award: e.target.checked })} style={chk} />
                  Include in Common App Honors section (separate from the 10-activity main list)
                </label>
              </>}

              {/* ── EDUCATIONAL PREP PROGRAM ── */}
              {isEduProg && <>
                <Field label="Program Name *">
                  <input value={form.organization || ''} onChange={e => pf({ organization: e.target.value })} placeholder="Upward Bound, TRIO, Girls Who Code Summer Immersion…" style={inp} />
                </Field>
                <Field label="Grade(s) participated">
                  <GradeCheckboxes value={form.grade_levels || ''} onChange={v => pf({ grade_levels: v })} />
                </Field>
                <TimeFields form={form} pf={pf} />
                <Field label="Describe the program" hint="What was its purpose? What did you do in it?">
                  <textarea value={form.description || ''} onChange={e => pf({ description: e.target.value })} rows={3} placeholder="A college-prep program for first-gen students. Attended weekly workshops on study skills, visited 6 college campuses, completed a personal statement…" style={{ ...inp, resize: 'vertical' }} />
                </Field>
              </>}

              {/* ── EXTRACURRICULAR ACTIVITY ── */}
              {isExtra && <>
                <Field label="Activity Name *">
                  <input value={form.organization || ''} onChange={e => pf({ organization: e.target.value })} placeholder="Varsity Soccer, Debate Club, Student Newspaper…" style={inp} />
                </Field>
                <Field label="Your Role / Position" hint="Your title or leadership role within this activity">
                  <input value={form.role || ''} onChange={e => pf({ role: e.target.value })} placeholder="Captain, President, Section Leader, Staff Writer…" style={inp} />
                </Field>
                <Field label="Grade(s) participated">
                  <GradeCheckboxes value={form.grade_levels || ''} onChange={v => pf({ grade_levels: v })} />
                </Field>
                <TimeFields form={form} pf={pf} />
                <Field label="What did you do?" hint="Focus on your specific contributions, leadership, and impact">
                  <textarea value={form.description || ''} onChange={e => pf({ description: e.target.value })} rows={3} placeholder="Led weekly practices for 22-player team; developed new training drills that improved shooting accuracy by 30%; guided team to regional championship…" style={{ ...inp, resize: 'vertical' }} />
                </Field>
                <label style={checkLabel}>
                  <input type="checkbox" checked={form.is_current} onChange={e => pf({ is_current: e.target.checked })} style={chk} />
                  Currently active
                </label>
                <Field label="Plan to continue this activity in college?">
                  <select value={form.intend_to_continue == null ? '' : form.intend_to_continue ? 'yes' : 'no'}
                    onChange={e => pf({ intend_to_continue: e.target.value === '' ? null : e.target.value === 'yes' })} style={inp}>
                    <option value="">Not sure / N/A</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </Field>
              </>}

              {/* ── OTHER COURSEWORK ── */}
              {isCourse && <>
                <Field label="Course Name *">
                  <input value={form.organization || ''} onChange={e => pf({ organization: e.target.value })} placeholder="Multivariable Calculus (community college), Online Data Science Certificate…" style={inp} />
                </Field>
                <Field label="Grade(s) taken">
                  <GradeCheckboxes value={form.grade_levels || ''} onChange={v => pf({ grade_levels: v })} />
                </Field>
                <TimeFields form={form} pf={pf} />
                <Field label="Describe the course" hint="What did you learn? Why did you take it?">
                  <textarea value={form.description || ''} onChange={e => pf({ description: e.target.value })} rows={3} placeholder="Calculus III taken at community college over two semesters. Covered partial derivatives, multiple integrals, and vector calculus…" style={{ ...inp, resize: 'vertical' }} />
                </Field>
              </>}

              {/* ── VOLUNTEER / COMMUNITY SERVICE ── */}
              {isService && <>
                <Field label="Organization Name *">
                  <input value={form.organization || ''} onChange={e => pf({ organization: e.target.value })} placeholder="Habitat for Humanity, Local Food Bank, School Tutoring Program…" style={inp} />
                </Field>
                <Field label="Describe the organization" hint="What does this org do? Who does it serve?">
                  <textarea value={form.organization_description || ''} onChange={e => pf({ organization_description: e.target.value })} rows={2} placeholder="A nonprofit that builds affordable housing for low-income families. Operates in 70 countries with over 2 million volunteers annually…" style={{ ...inp, resize: 'vertical' }} />
                </Field>
                <Field label="Grade(s) volunteered">
                  <GradeCheckboxes value={form.grade_levels || ''} onChange={v => pf({ grade_levels: v })} />
                </Field>
                <TimeFields form={form} pf={pf} />
                <Field label="What did you do?" hint="Your specific role, tasks, and impact">
                  <textarea value={form.description || ''} onChange={e => pf({ description: e.target.value })} rows={3} placeholder="Tutored 8 middle school students in algebra twice a week. Designed practice worksheets used by 3 other tutors. Average tutee grade improved from D+ to B…" style={{ ...inp, resize: 'vertical' }} />
                </Field>
                <label style={checkLabel}>
                  <input type="checkbox" checked={form.is_current} onChange={e => pf({ is_current: e.target.checked })} style={chk} />
                  Currently volunteering
                </label>
                <Field label="Plan to continue in college?">
                  <select value={form.intend_to_continue == null ? '' : form.intend_to_continue ? 'yes' : 'no'}
                    onChange={e => pf({ intend_to_continue: e.target.value === '' ? null : e.target.value === 'yes' })} style={inp}>
                    <option value="">Not sure / N/A</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </Field>
              </>}

              {/* ── WORK EXPERIENCE ── */}
              {isWork && <>
                <Field label="Employer / Company Name *">
                  <input value={form.organization || ''} onChange={e => pf({ organization: e.target.value })} placeholder="Starbucks, Dr. Jane Smith DDS, XYZ Landscaping…" style={inp} />
                </Field>
                <Field label="Describe the company or organization" hint="What does the company do? Size, industry, etc.">
                  <textarea value={form.organization_description || ''} onChange={e => pf({ organization_description: e.target.value })} rows={2} placeholder="A regional dental practice with 3 dentists serving ~1,200 patients. Specializes in pediatric and family dentistry…" style={{ ...inp, resize: 'vertical' }} />
                </Field>
                <Field label="Job Title *">
                  <input value={form.role || ''} onChange={e => pf({ role: e.target.value })} placeholder="Barista, Dental Assistant, Lawn Care Technician…" style={inp} />
                </Field>
                <Field label="Grade(s) worked">
                  <GradeCheckboxes value={form.grade_levels || ''} onChange={v => pf({ grade_levels: v })} />
                </Field>
                <TimeFields form={form} pf={pf} />
                <Field label="Job responsibilities" hint="What did you actually do? Specific tasks, any leadership or growth">
                  <textarea value={form.description || ''} onChange={e => pf({ description: e.target.value })} rows={3} placeholder="Prepared espresso drinks for 100+ customers/day. Trained 3 new baristas. Recognized as Employee of the Month twice for accuracy and speed…" style={{ ...inp, resize: 'vertical' }} />
                </Field>
                <label style={checkLabel}>
                  <input type="checkbox" checked={form.still_working} onChange={e => pf({ still_working: e.target.checked })} style={chk} />
                  Still working at this job
                </label>
                <Field label="What did you do with your earnings?" hint="UC asks this — e.g. savings, tuition, family expenses, personal spending">
                  <input value={form.earnings_use || ''} onChange={e => pf({ earnings_use: e.target.value })} placeholder="Saved for college tuition; covered family grocery expenses…" style={inp} />
                </Field>
              </>}

            </div>

            {saveError && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: 14 }}>⚠ {saveError}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={saveActivity} disabled={saving} style={{ ...btnPrimary, flex: 1, padding: '10px 0', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Entry'}
              </button>
              <button onClick={closeModal} style={{ background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 24px', fontSize: '0.875rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tiny sub-components ───────────────────────────────────────────────────────

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: '0.75rem', color: '#6b7280', background: '#f8fafc', border: '1px solid #e8ecf3', borderRadius: 6, padding: '2px 8px' }}>
      {children}
    </span>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={lbl}>{label}{hint && <span style={optional}> — {hint}</span>}</label>
      {children}
    </div>
  )
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>
}

function TimeFields({ form, pf }: { form: FormState; pf: (u: Partial<FormState>) => void }) {
  return (
    <TwoCol>
      <Field label="Hours / Week">
        <input type="number" min="0" max="168" value={form.hours_per_week as string}
          onChange={e => pf({ hours_per_week: e.target.value })} placeholder="10" style={inp} />
      </Field>
      <Field label="Weeks / Year">
        <input type="number" min="0" max="52" value={form.weeks_per_year as string}
          onChange={e => pf({ weeks_per_year: e.target.value })} placeholder="36" style={inp} />
      </Field>
    </TwoCol>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const centerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af', fontFamily: 'system-ui, sans-serif' }

const lbl: React.CSSProperties = { display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }
const optional: React.CSSProperties = { fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }
const inp: React.CSSProperties = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: '0.875rem', background: '#fff', color: '#111827', boxSizing: 'border-box' }
const snippetStyle: React.CSSProperties = { fontSize: '0.8rem', color: '#374151', lineHeight: 1.55, marginTop: 4 }
const checkLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', fontSize: '0.875rem', color: '#374151', fontWeight: 500 }
const chk: React.CSSProperties = { width: 16, height: 16, accentColor: '#4f46e5', cursor: 'pointer' }

const btnPrimary: React.CSSProperties = { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
const btnEdit: React.CSSProperties = { background: '#f0f4ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 7, padding: '5px 13px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
const btnRemove: React.CSSProperties = { background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 7, padding: '5px 13px', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }

// ── Page export ───────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<div style={centerStyle}>Loading…</div>}>
      <ActivitiesContent />
    </Suspense>
  )
}
