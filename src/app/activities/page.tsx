'use client'

import { useEffect, useState, Suspense } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Activity {
  id: number
  category: string
  role: string
  organization: string
  description?: string
  grade_levels?: string
  hours_per_week?: number
  weeks_per_year?: number
  timing?: string
  is_current: boolean
  display_order: number
}

interface FormState {
  category: string
  role: string
  organization: string
  description: string
  grade_levels: string
  hours_per_week: string
  weeks_per_year: string
  timing: string
  is_current: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Extracurricular Activity',
  'Sport / Athletics',
  'Arts & Performing Arts',
  'Music',
  'Theater & Dance',
  'Leadership & Student Government',
  'Community Service & Volunteering',
  'Academic Club & Honor Society',
  'Research & Science',
  'Work / Employment / Internship',
  'Religious & Cultural',
  'Other',
]

const TIMING_LABELS: Record<string, string> = {
  school_year: 'School Year',
  summer: 'Summer',
  year_round: 'Year-Round',
}

const BLANK: FormState = {
  category: '',
  role: '',
  organization: '',
  description: '',
  grade_levels: '',
  hours_per_week: '',
  weeks_per_year: '',
  timing: 'school_year',
  is_current: true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function categoryStyle(cat: string): { accent: string; bg: string; text: string } {
  const c = (cat || '').toLowerCase()
  if (c.includes('sport') || c.includes('athletic'))
    return { accent: '#22c55e', bg: '#f0fdf4', text: '#166534' }
  if (c.includes('music'))
    return { accent: '#ec4899', bg: '#fdf2f8', text: '#9d174d' }
  if (c.includes('arts') || c.includes('theater') || c.includes('dance') || c.includes('perform'))
    return { accent: '#a855f7', bg: '#faf5ff', text: '#6b21a8' }
  if (c.includes('leadership') || c.includes('student gov') || c.includes('politics'))
    return { accent: '#f59e0b', bg: '#fffbeb', text: '#92400e' }
  if (c.includes('community') || c.includes('volunteer') || c.includes('service'))
    return { accent: '#14b8a6', bg: '#f0fdfa', text: '#134e4a' }
  if (c.includes('academic') || c.includes('honor'))
    return { accent: '#0ea5e9', bg: '#f0f9ff', text: '#0c4a6e' }
  if (c.includes('research') || c.includes('science'))
    return { accent: '#f43f5e', bg: '#fff1f2', text: '#881337' }
  if (c.includes('work') || c.includes('employ') || c.includes('intern'))
    return { accent: '#f97316', bg: '#fff7ed', text: '#7c2d12' }
  if (c.includes('religious') || c.includes('cultural') || c.includes('identity'))
    return { accent: '#8b5cf6', bg: '#f5f3ff', text: '#4c1d95' }
  return { accent: '#6366f1', bg: '#eef2ff', text: '#3730a3' }
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

  // ── Load data ───────────────────────────────────────────────────────────────

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

        const usageRes = await fetch(`${apiUrl}/my-usage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!usageRes.ok) { setError('Not signed in.'); setLoading(false); return }
        const usage = await usageRes.json()
        setMyUserId(usage.user_id)

        const targetId = forStudentId ?? usage.user_id

        if (forStudentId) {
          const studentsRes = await fetch(`${apiUrl}/my-students`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (studentsRes.ok) {
            const students: Array<{ id: number; full_name: string; email: string }> = await studentsRes.json()
            const match = students.find((s) => s.id === forStudentId)
            if (match) setStudentName(match.full_name || match.email)
          }
        }

        const profRes = await fetch(`${apiUrl}/profile/${targetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (profRes.ok) {
          const data = await profRes.json()
          setActivities(data.activities || [])
          if (typeof data.can_write === 'boolean') setCanWrite(data.can_write)
        }
      } catch {
        setError('Failed to load activities.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getToken, apiUrl, forStudentId, clerkUser])

  const targetId = forStudentId ?? myUserId

  // ── Modal helpers ───────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingId(null)
    setForm({ ...BLANK })
    setSaveError(null)
    setModalOpen(true)
  }

  const openEdit = (a: Activity) => {
    setEditingId(a.id)
    setForm({
      category: a.category || '',
      role: a.role || '',
      organization: a.organization || '',
      description: a.description || '',
      grade_levels: a.grade_levels || '',
      hours_per_week: a.hours_per_week != null ? String(a.hours_per_week) : '',
      weeks_per_year: a.weeks_per_year != null ? String(a.weeks_per_year) : '',
      timing: a.timing || 'school_year',
      is_current: a.is_current,
    })
    setSaveError(null)
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setEditingId(null) }

  const saveActivity = async () => {
    if (!targetId || !canWrite) return
    if (!form.category.trim() || !form.role.trim() || !form.organization.trim()) {
      setSaveError('Category, Role, and Organization are required.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const token = await getToken()
      const payload = {
        category: form.category.trim(),
        role: form.role.trim(),
        organization: form.organization.trim(),
        description: form.description.trim() || null,
        grade_levels: form.grade_levels.trim() || null,
        hours_per_week: form.hours_per_week ? parseInt(form.hours_per_week) : null,
        weeks_per_year: form.weeks_per_year ? parseInt(form.weeks_per_year) : null,
        timing: form.timing,
        is_current: form.is_current,
      }
      if (editingId) {
        const res = await fetch(`${apiUrl}/profile/activities/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const updated = await res.json()
          setActivities((prev) => prev.map((a) => (a.id === editingId ? updated : a)))
          closeModal()
        } else {
          const body = await res.json().catch(() => ({}))
          setSaveError(body.detail || 'Save failed.')
        }
      } else {
        const res = await fetch(`${apiUrl}/profile/${targetId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const created = await res.json()
          setActivities((prev) => [...prev, created])
          closeModal()
        } else {
          const body = await res.json().catch(() => ({}))
          setSaveError(body.detail || 'Save failed.')
        }
      }
    } catch {
      setSaveError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const deleteActivity = async (id: number) => {
    if (!canWrite || !confirm('Remove this activity?')) return
    const token = await getToken()
    await fetch(`${apiUrl}/profile/activities/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setActivities((prev) => prev.filter((a) => a.id !== id))
  }

  // ── Drag-and-drop ───────────────────────────────────────────────────────────

  const reorder = async (newOrder: Activity[]) => {
    setActivities(newOrder)
    if (!targetId) return
    try {
      const token = await getToken()
      await fetch(`${apiUrl}/profile/${targetId}/activities/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: newOrder.map((a) => a.id) }),
      })
    } catch { /* ignore — optimistic update already applied */ }
  }

  const handleDragStart = (index: number) => setDragSrcIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index) }
  const handleDrop = (dropIndex: number) => {
    if (dragSrcIndex === null || dragSrcIndex === dropIndex) {
      setDragSrcIndex(null); setDragOverIndex(null); return
    }
    const next = [...activities]
    const [moved] = next.splice(dragSrcIndex, 1)
    next.splice(dropIndex, 0, moved)
    setDragSrcIndex(null); setDragOverIndex(null)
    reorder(next)
  }
  const handleDragEnd = () => { setDragSrcIndex(null); setDragOverIndex(null) }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af', fontFamily: 'system-ui, sans-serif' }}>
      Loading…
    </div>
  )
  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#ef4444', fontFamily: 'system-ui, sans-serif' }}>
      {error}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Header ── */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/chat" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 5 }}>
            ← Back to Soar
          </Link>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0c1b33' }}>
              <span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr
            </span>
          </Link>
        </div>
        {canWrite && (
          <button
            onClick={openAdd}
            style={{
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Add Activity
          </button>
        )}
      </header>

      {/* ── Body ── */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0c1b33', marginBottom: 6 }}>
            {studentName ? `${studentName}'s Activities & Awards` : 'Activities & Awards'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
            {canWrite
              ? 'Drag cards to reorder · Click Edit to update · Soar uses these to personalize your college recommendations.'
              : 'Read-only view of this student\'s activities and awards.'}
          </p>
        </div>

        {/* ── Cards ── */}
        {activities.length === 0 ? (

          /* Empty state */
          <div style={{
            background: '#fff',
            border: '2px dashed #e2e8f0',
            borderRadius: 16,
            padding: '56px 32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏆</div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#374151', marginBottom: 8 }}>No activities yet</p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
              Add your extracurriculars, sports, jobs, honors, awards, and anything else that makes you stand out.
            </p>
            {canWrite && (
              <button
                onClick={openAdd}
                style={{
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 28px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Add First Activity
              </button>
            )}
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activities.map((a, index) => {
              const cs = categoryStyle(a.category)
              const isDragging = dragSrcIndex === index
              const isOver = dragOverIndex === index && dragSrcIndex !== index && dragSrcIndex !== null

              return (
                <div
                  key={a.id}
                  draggable={canWrite}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    background: '#fff',
                    border: `1px solid ${isOver ? '#6366f1' : '#e8ecf3'}`,
                    borderLeft: `4px solid ${cs.accent}`,
                    borderRadius: 12,
                    padding: '16px 18px 16px 16px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    opacity: isDragging ? 0.35 : 1,
                    transform: isOver ? 'translateY(-3px)' : 'none',
                    boxShadow: isOver
                      ? `0 6px 20px rgba(99,102,241,0.18)`
                      : '0 1px 4px rgba(0,0,0,0.05)',
                    transition: 'box-shadow 0.15s, transform 0.12s, border-color 0.15s, opacity 0.1s',
                    cursor: canWrite ? 'grab' : 'default',
                  }}
                >
                  {/* Drag handle */}
                  {canWrite && (
                    <div
                      title="Drag to reorder"
                      style={{
                        color: '#cbd5e1',
                        fontSize: '1.15rem',
                        marginTop: 18,
                        flexShrink: 0,
                        cursor: 'grab',
                        userSelect: 'none',
                        lineHeight: 1,
                      }}
                    >
                      ⠿
                    </div>
                  )}

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Category pill + current badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9, flexWrap: 'wrap' }}>
                      <span style={{
                        background: cs.bg,
                        color: cs.text,
                        border: `1px solid ${cs.accent}55`,
                        borderRadius: 20,
                        padding: '3px 11px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                      }}>
                        {a.category}
                      </span>
                      {a.is_current && (
                        <span style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #86efac55',
                          borderRadius: 20,
                          padding: '3px 10px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
                          Current
                        </span>
                      )}
                    </div>

                    {/* Role */}
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: 2, lineHeight: 1.3 }}>
                      {a.role}
                    </p>

                    {/* Organization */}
                    <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: 8 }}>
                      {a.organization}
                    </p>

                    {/* Stats chips */}
                    {(a.grade_levels || a.hours_per_week || a.weeks_per_year || (a.timing && a.timing !== 'school_year')) && (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: a.description ? 10 : 0 }}>
                        {a.grade_levels && (
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', background: '#f8fafc', border: '1px solid #e8ecf3', borderRadius: 6, padding: '2px 8px' }}>
                            🎓 {a.grade_levels}
                          </span>
                        )}
                        {a.hours_per_week && (
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', background: '#f8fafc', border: '1px solid #e8ecf3', borderRadius: 6, padding: '2px 8px' }}>
                            ⏱ {a.hours_per_week} hrs/wk
                          </span>
                        )}
                        {a.weeks_per_year && (
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', background: '#f8fafc', border: '1px solid #e8ecf3', borderRadius: 6, padding: '2px 8px' }}>
                            📅 {a.weeks_per_year} wks/yr
                          </span>
                        )}
                        {a.timing && a.timing !== 'school_year' && (
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', background: '#f8fafc', border: '1px solid #e8ecf3', borderRadius: 6, padding: '2px 8px' }}>
                            {TIMING_LABELS[a.timing] ?? a.timing}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {a.description && (
                      <p style={{
                        fontSize: '0.8rem',
                        color: '#374151',
                        lineHeight: 1.55,
                        borderTop: '1px solid #f1f3f7',
                        paddingTop: 9,
                        marginTop: 6,
                      }}>
                        {a.description}
                      </p>
                    )}
                  </div>

                  {/* Edit / Remove */}
                  {canWrite && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, marginTop: 2 }}>
                      <button
                        onClick={() => openEdit(a)}
                        style={{
                          background: '#f0f4ff',
                          color: '#4f46e5',
                          border: '1px solid #c7d2fe',
                          borderRadius: 7,
                          padding: '5px 13px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteActivity(a.id)}
                        style={{
                          background: 'transparent',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: 7,
                          padding: '5px 13px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add another button */}
            {canWrite && (
              <button
                onClick={openAdd}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#eef2ff')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                style={{
                  background: '#fff',
                  color: '#4f46e5',
                  border: '2px dashed #c7d2fe',
                  borderRadius: 12,
                  padding: '14px',
                  width: '100%',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                + Add Another Activity or Award
              </button>
            )}
          </div>
        )}

        {/* Common App note */}
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', marginTop: 32 }}>
          💡 Common App allows up to 10 activities · Descriptions are capped at 150 characters
        </p>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
          }}
        >
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '28px 32px',
            width: '100%',
            maxWidth: 540,
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0c1b33' }}>
                {editingId ? 'Edit Activity' : 'Add Activity'}
              </h2>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Category — datalist combo */}
              <div>
                <label style={labelStyle}>Category *</label>
                <input
                  list="activity-categories"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="Choose or type a category…"
                  style={inputStyle}
                />
                <datalist id="activity-categories">
                  {CATEGORIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>

              {/* Role + Organization */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Role / Position *</label>
                  <input
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    placeholder="Captain, President…"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Organization *</label>
                  <input
                    value={form.organization}
                    onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                    placeholder="School, club, company…"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Grade levels + Timing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Grade Levels</label>
                  <input
                    value={form.grade_levels}
                    onChange={(e) => setForm((p) => ({ ...p, grade_levels: e.target.value }))}
                    placeholder="9th–12th, 11th–12th…"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Timing</label>
                  <select
                    value={form.timing}
                    onChange={(e) => setForm((p) => ({ ...p, timing: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="school_year">School Year</option>
                    <option value="summer">Summer</option>
                    <option value="year_round">Year-Round</option>
                  </select>
                </div>
              </div>

              {/* Hours + Weeks */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Hours / Week</label>
                  <input
                    type="number" min="0" max="168"
                    value={form.hours_per_week}
                    onChange={(e) => setForm((p) => ({ ...p, hours_per_week: e.target.value }))}
                    placeholder="10"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Weeks / Year</label>
                  <input
                    type="number" min="0" max="52"
                    value={form.weeks_per_year}
                    onChange={(e) => setForm((p) => ({ ...p, weeks_per_year: e.target.value }))}
                    placeholder="36"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Currently active checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={form.is_current}
                  onChange={(e) => setForm((p) => ({ ...p, is_current: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#4f46e5', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
                  Currently active
                </span>
              </label>

              {/* Description */}
              <div>
                <label style={labelStyle}>
                  Description{' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>
                    — optional · up to 150 chars for Common App
                  </span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Briefly describe your role, impact, and key accomplishments…"
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
                />
                {form.description.length > 0 && (
                  <p style={{
                    fontSize: '0.7rem',
                    color: form.description.length > 150 ? '#dc2626' : '#9ca3af',
                    textAlign: 'right',
                    marginTop: 4,
                  }}>
                    {form.description.length} / 150
                  </p>
                )}
              </div>
            </div>

            {saveError && (
              <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚠ {saveError}
              </p>
            )}

            {/* Modal actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={saveActivity}
                disabled={saving}
                style={{
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 0',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  flex: 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Activity'}
              </button>
              <button
                onClick={closeModal}
                style={{
                  background: '#f9fafb',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared style objects ──────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#374151',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: '0.875rem',
  background: '#fff',
  color: '#111827',
  boxSizing: 'border-box',
  outline: 'none',
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af', fontFamily: 'system-ui, sans-serif' }}>
        Loading…
      </div>
    }>
      <ActivitiesContent />
    </Suspense>
  )
}
