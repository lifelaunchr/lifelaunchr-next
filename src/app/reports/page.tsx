'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Student {
  id: number
  full_name: string
  preferred_name?: string
  email: string
}

interface SessionReport {
  id: number
  coach_id: number
  coach_name?: string   // present in team-view (joined from users)
  student_id: number
  report_type: 'single' | 'multiple' | 'note'
  appointment_type: string
  appointment_date?: string
  appointment_time?: string
  appointment_duration?: number
  start_date?: string
  end_date?: string
  total_duration?: number
  attended?: string
  additional_emails?: string
  raw_notes?: string
  shared_notes?: string
  internal_notes?: string
  otter_transcript?: string
  sent_at?: string
  created_at: string
  updated_at: string
}

const APPOINTMENT_TYPES = [
  'College Admissions Coaching',
  'Test-Prep Tutoring',
  'Academic Tutoring',
  'Initial Consultation',
  'Other',
]

const ATTENDED_OPTIONS = [
  'Attended',
  'Canceled (with more than 24 hours notice)',
  'Canceled Late (with less than 24 hours notice)',
  'Missed (or canceled with less than 30 minutes notice)',
]

const DURATION_PRESETS = [30, 45, 60, 90]

const REPORT_TYPE_LABELS: Record<string, string> = {
  single: 'Single Session',
  multiple: 'Multiple Sessions',
  note: 'Note',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function reportLabel(r: SessionReport) {
  if (r.report_type === 'multiple') {
    return `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`
  }
  if (r.report_type === 'note') {
    return fmtDate(r.created_at?.slice(0, 10))
  }
  return fmtDate(r.appointment_date)
}

const badgeStyle = (type: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; color: string }> = {
    single:   { bg: '#ede9fe', color: '#5b21b6' },
    multiple: { bg: '#dbeafe', color: '#1e40af' },
    note:     { bg: '#fce7f3', color: '#9d174d' },
  }
  const c = colors[type] || { bg: '#f3f4f6', color: '#374151' }
  return {
    display: 'inline-block',
    background: c.bg,
    color: c.color,
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.03em',
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────

function ReportsContent() {
  const { getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const searchParams = useSearchParams()

  const [students, setStudents] = useState<Student[]>([])
  const [reports, setReports] = useState<SessionReport[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    searchParams.get('student_id') ? parseInt(searchParams.get('student_id')!, 10) : null
  )
  const [selectedReport, setSelectedReport] = useState<SessionReport | null>(null)
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const [listPage, setListPage] = useState(0)
  const LIST_PAGE_SIZE = 20
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [isStudent, setIsStudent] = useState(false)
  const [coachName, setCoachName] = useState('')
  const [myUserId, setMyUserId] = useState<number | null>(null)

  // Tenant admin state
  const [isTenantAdmin, setIsTenantAdmin] = useState(false)
  const [teamView, setTeamView] = useState(false)
  const [teamReports, setTeamReports] = useState<SessionReport[]>([])
  const [teamReportsLoading, setTeamReportsLoading] = useState(false)

  // Form state
  const [reportType, setReportType] = useState<'single' | 'multiple' | 'note'>('single')
  const [formStudentId, setFormStudentId] = useState<number | null>(selectedStudentId)
  const [appointmentType, setAppointmentType] = useState('College Admissions Coaching')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [appointmentDuration, setAppointmentDuration] = useState<number | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalDuration, setTotalDuration] = useState<number | ''>('')
  const [attended, setAttended] = useState('Attended')
  const [additionalEmails, setAdditionalEmails] = useState('')
  const [rawNotes, setRawNotes] = useState('')
  const [otterTranscript, setOtterTranscript] = useState('')
  const [sharedNotes, setSharedNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [showOtter, setShowOtter] = useState(false)

  // Sent read-only / edit-resend state
  const [editResendMode, setEditResendMode] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendConfirm, setResendConfirm] = useState<string | null>(null)
  const [saveResending, setSaveResending] = useState(false)

  // UI state
  const [drafting, setDrafting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentBanner, setSentBanner] = useState<string | null>(null)   // top green banner after send
  const [sentConfirm, setSentConfirm] = useState<string | null>(null) // error feedback only now
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )
  const [panelHeight, setPanelHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight - 49 : 600
  )

  // ── Detect mobile + compute panel height from JS (avoids all CSS viewport quirks) ──

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 768)
      const headerEl = document.getElementById('reports-header')
      setPanelHeight(window.innerHeight - (headerEl?.offsetHeight ?? 49))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // ── Load students + usage ──────────────────────────────────────────────────

  useEffect(() => {
    if (!clerkUser) return
    const init = async () => {
      try {
        const token = await getToken()
        if (!token) { setAccessDenied(true); setLoading(false); return }

        const usageRes = await fetch(`${apiUrl}/my-usage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!usageRes.ok) { setAccessDenied(true); setLoading(false); return }
        const usage = await usageRes.json()
        const studentMode = usage.account_type === 'student'
        if (!studentMode && usage.account_type !== 'counselor' && !usage.is_admin) {
          setAccessDenied(true); setLoading(false); return
        }
        setIsStudent(studentMode)
        setMyUserId(usage.user_id)
        setCoachName(clerkUser.fullName || clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress || '')
        setIsTenantAdmin(Boolean(usage.is_tenant_admin))

        if (studentMode) {
          // Students load their own reports directly — no student picker needed
          const rRes = await fetch(`${apiUrl}/session-reports`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (rRes.ok) {
            const data = await rRes.json()
            setReports(data.reports || [])
          }
        } else {
          const studRes = await fetch(`${apiUrl}/my-students`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (studRes.ok) {
            const data: Student[] = await studRes.json()
            setStudents(data)
          }
        }
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    }
    init()
  }, [clerkUser, getToken])

  // ── Load reports when student filter changes ───────────────────────────────

  const loadReports = useCallback(async (studentId: number | null) => {
    if (!studentId) { setReports([]); return }
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/session-reports?student_id=${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports || [])
      }
    } catch { /* ignore */ }
  }, [getToken])

  useEffect(() => {
    loadReports(selectedStudentId)
  }, [selectedStudentId, loadReports])

  // ── Load team reports (tenant admin view) ─────────────────────────────────

  const loadTeamReports = useCallback(async () => {
    setTeamReportsLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/session-reports?all_team=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTeamReports(data.reports || [])
      }
    } catch { /* ignore */ } finally {
      setTeamReportsLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    if (teamView) {
      loadTeamReports()
      setSelectedReport(null)
    }
  }, [teamView, loadTeamReports])

  // ── Populate form when a report is selected ────────────────────────────────

  const populateForm = (r: SessionReport) => {
    setReportType(r.report_type)
    setFormStudentId(r.student_id)
    setAppointmentType(r.appointment_type)
    setAppointmentDate(r.appointment_date || '')
    setAppointmentTime(r.appointment_time || '')
    setAppointmentDuration(r.appointment_duration ?? '')
    setStartDate(r.start_date || '')
    setEndDate(r.end_date || '')
    setTotalDuration(r.total_duration ?? '')
    setAttended(r.attended || 'Attended')
    setAdditionalEmails(r.additional_emails || '')
    setRawNotes(r.raw_notes || '')
    setOtterTranscript(r.otter_transcript || '')
    setSharedNotes(r.shared_notes || '')
    setInternalNotes(r.internal_notes || '')
    setShowOtter(false)
    setSentConfirm(null)
    setSaveMsg(null)
    setEditResendMode(false)
    setResendConfirm(null)
  }

  const resetForm = () => {
    setReportType('single')
    setFormStudentId(selectedStudentId)
    // Keep appointmentType (coaches run same type back-to-back)
    setAppointmentDate('')
    setAppointmentTime('')
    setAppointmentDuration('')
    setStartDate('')
    setEndDate('')
    setTotalDuration('')
    setAttended('Attended')
    setAdditionalEmails('')
    setRawNotes('')
    setOtterTranscript('')
    setSharedNotes('')
    setInternalNotes('')
    setShowOtter(false)
    setSelectedReport(null)
    setSentConfirm(null)
    setSaveMsg(null)
    setEditResendMode(false)
    setResendConfirm(null)
  }

  // ── AI Draft ───────────────────────────────────────────────────────────────

  const handleDraft = async () => {
    if (!rawNotes && !otterTranscript) return
    setDrafting(true)
    try {
      const token = await getToken()
      const student = students.find((s) => s.id === formStudentId)
      const nameParts = (student?.full_name || '').split(' ')
      const res = await fetch(`${apiUrl}/session-reports/draft`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coach_name: coachName,
          student_first_name: nameParts[0] || '',
          student_last_name: nameParts.slice(1).join(' ') || '',
          report_type: reportType,
          appointment_type: appointmentType,
          appointment_date: appointmentDate,
          start_date: startDate,
          end_date: endDate,
          appointment_duration: appointmentDuration || null,
          total_duration: totalDuration || null,
          raw_notes: rawNotes,
          otter_transcript: otterTranscript,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.shared_notes) setSharedNotes(data.shared_notes)
        if (data.internal_notes) setInternalNotes(data.internal_notes)
      }
    } catch { /* ignore */ } finally {
      setDrafting(false)
    }
  }

  // ── Save Draft ─────────────────────────────────────────────────────────────

  const buildPayload = () => ({
    report_type: reportType,
    appointment_type: appointmentType,
    student_id: formStudentId,
    appointment_date: appointmentDate || null,
    appointment_time: appointmentTime || null,
    appointment_duration: appointmentDuration || null,
    start_date: startDate || null,
    end_date: endDate || null,
    total_duration: totalDuration || null,
    attended,
    additional_emails: additionalEmails || null,
    raw_notes: rawNotes || null,
    shared_notes: sharedNotes || null,
    internal_notes: internalNotes || null,
    otter_transcript: otterTranscript || null,
  })

  const saveDraft = async (): Promise<SessionReport | null> => {
    if (!formStudentId) { setSaveMsg('Select a student first.'); return null }
    setSaving(true)
    setSaveMsg(null)
    try {
      const token = await getToken()
      let res: Response
      if (selectedReport) {
        res = await fetch(`${apiUrl}/session-reports/${selectedReport.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        })
      } else {
        res = await fetch(`${apiUrl}/session-reports`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        })
      }
      if (res.ok) {
        const saved: SessionReport = await res.json()
        setSelectedReport(saved)
        setSaveMsg('Draft saved.')
        setTimeout(() => setSaveMsg(null), 2000)
        await loadReports(selectedStudentId)
        return saved
      } else {
        const err = await res.json().catch(() => ({}))
        setSaveMsg(err.detail || 'Save failed.')
      }
    } catch {
      setSaveMsg('Network error.')
    } finally {
      setSaving(false)
    }
    return null
  }

  // ── Save & Send ────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const saved = await saveDraft()
    if (!saved) return
    setSending(true)
    setSentConfirm(null)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/session-reports/${saved.id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        // Show green banner with student name
        const student = students.find((s) => s.id === formStudentId)
        const studentName = student?.preferred_name || student?.full_name || 'student'
        setSentBanner(`Report sent to ${studentName}`)
        setTimeout(() => setSentBanner(null), 3000)
        await loadReports(selectedStudentId)
        // Reset form but keep student selected
        const keptAppointmentType = appointmentType
        resetForm()
        setAppointmentType(keptAppointmentType)
      } else {
        const err = await res.json().catch(() => ({}))
        setSentConfirm(`Send failed: ${err.detail || res.statusText}`)
      }
    } catch {
      setSentConfirm('Network error during send.')
    } finally {
      setSending(false)
    }
  }

  // ── Resend (sent report — no edits) ───────────────────────────────────────

  const handleResend = async () => {
    if (!selectedReport) return
    setResending(true)
    setResendConfirm(null)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/session-reports/${selectedReport.id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setResendConfirm('Resent')
        setTimeout(() => setResendConfirm(null), 2500)
      } else {
        const err = await res.json().catch(() => ({}))
        setResendConfirm(`Resend failed: ${err.detail || res.statusText}`)
      }
    } catch {
      setResendConfirm('Network error.')
    } finally {
      setResending(false)
    }
  }

  // ── Save & Resend (edit-resend mode) ──────────────────────────────────────

  const handleSaveResend = async () => {
    if (!selectedReport) return
    setSaveResending(true)
    setSentConfirm(null)
    try {
      const token = await getToken()
      // PATCH first
      const patchRes = await fetch(`${apiUrl}/session-reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}))
        setSentConfirm(`Save failed: ${err.detail || patchRes.statusText}`)
        return
      }
      // Then send
      const sendRes = await fetch(`${apiUrl}/session-reports/${selectedReport.id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (sendRes.ok) {
        const student = students.find((s) => s.id === formStudentId)
        const studentName = student?.preferred_name || student?.full_name || 'student'
        setSentBanner(`Report sent to ${studentName}`)
        setTimeout(() => setSentBanner(null), 3000)
        await loadReports(selectedStudentId)
        const keptAppointmentType = appointmentType
        resetForm()
        setAppointmentType(keptAppointmentType)
      } else {
        const err = await sendRes.json().catch(() => ({}))
        setSentConfirm(`Send failed: ${err.detail || sendRes.statusText}`)
      }
    } catch {
      setSentConfirm('Network error.')
    } finally {
      setSaveResending(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!selectedReport) return
    if (!confirm('Delete this report? This cannot be undone.')) return
    try {
      const token = await getToken()
      await fetch(`${apiUrl}/session-reports/${selectedReport.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      resetForm()
      await loadReports(selectedStudentId)
    } catch { /* ignore */ }
  }

  // ── Derived view flags ──────────────────────────────────────────────────────

  const isSentReport = !teamView && Boolean(selectedReport?.sent_at)
  const isReadOnly = isStudent || teamView || (isSentReport && !editResendMode)

  // ── Styles ─────────────────────────────────────────────────────────────────

  const inputSt: React.CSSProperties = {
    width: '100%', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '7px 11px', fontSize: '0.875rem', outline: 'none',
    boxSizing: 'border-box', background: '#fff', color: '#111827',
  }
  const inputDisabledSt: React.CSSProperties = {
    ...inputSt,
    background: '#f9fafb', color: '#6b7280', cursor: 'not-allowed',
  }
  const labelSt: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: '#4b5563', marginBottom: 4,
  }
  const sectionSt: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 12, padding: 20, marginBottom: 16,
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af' }}>
        Loading…
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔒</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>Access Restricted</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Session Reports are available to counselors and students only.
          </p>
          <Link href="/chat" style={{ display: 'inline-block', marginTop: 20, color: '#4f46e5', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Back to Soar
          </Link>
        </div>
      </div>
    )
  }

  // ── Active list & reports for current view mode ───────────────────────────

  const activeReports = teamView ? teamReports : reports
  const totalPages = Math.ceil(activeReports.length / LIST_PAGE_SIZE)
  const pagedReports = activeReports.slice(listPage * LIST_PAGE_SIZE, (listPage + 1) * LIST_PAGE_SIZE)

  // ── Layout styles — mobile uses normal flow, desktop uses fixed two-panel ──
  const outerSt: React.CSSProperties = isMobile
    ? { background: '#f9fafb' }
    : { position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, display: 'flex', flexDirection: 'column', background: '#f9fafb' }

  const headerSt: React.CSSProperties = isMobile
    ? { background: '#0c1b33', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }
    : { flexShrink: 0, background: '#0c1b33', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }

  const twoPanelSt: React.CSSProperties = isMobile
    ? { display: 'block' }
    : { position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', ...(panelHeight > 0 ? { height: panelHeight } : {}) }

  const asideSt: React.CSSProperties = isMobile
    ? {
        display: mobileShowDetail ? 'none' : 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: 'calc(100vh - 49px)',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
      }
    : {
        position: 'absolute', top: 0, bottom: 0, left: 0,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        width: 320,
        background: '#fff', borderRight: '1px solid #e5e7eb',
      }

  const mainSt: React.CSSProperties = isMobile
    ? {
        display: mobileShowDetail ? 'flex' : 'none',
        flexDirection: 'column',
        width: '100%',
        minHeight: 'calc(100vh - 49px)',
        overflowY: 'auto',
        padding: 24,
      }
    : {
        position: 'absolute', top: 0, bottom: 0, left: 320, right: 0,
        display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 24,
      }

  return (
    <div style={outerSt}>
      {/* Top nav */}
      <header id="reports-header" style={headerSt}>
        <Link href="/" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
          <span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr
        </Link>
        <Link href="/chat" style={{ fontSize: '0.82rem', color: '#8888aa', textDecoration: 'none', border: '1px solid #444466', padding: '4px 12px', borderRadius: 6 }}>
          ← Back to Soar
        </Link>
      </header>

      {/* Two-panel */}
      <div style={twoPanelSt}>

        {/* Left Panel — Report List */}
        <aside style={asideSt}>
          {/* Panel header */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33', margin: 0 }}>Session Reports</h1>
              {!teamView && !isStudent && (
                <button
                  onClick={() => { resetForm(); setMobileShowDetail(true) }}
                  style={{
                    background: '#4f46e5', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  + New Report
                </button>
              )}
            </div>

            {/* Tenant admin: My Reports / Team Reports toggle */}
            {!isStudent && isTenantAdmin && (
              <div style={{ display: 'flex', gap: 0, marginBottom: 12, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  onClick={() => { setTeamView(false); setListPage(0) }}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: '0.78rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: !teamView ? '#4f46e5' : '#f9fafb',
                    color: !teamView ? '#fff' : '#6b7280',
                  }}
                >
                  My Reports
                </button>
                <button
                  onClick={() => { setTeamView(true); setListPage(0) }}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: '0.78rem', fontWeight: 600,
                    border: 'none', borderLeft: '1px solid #e5e7eb', cursor: 'pointer',
                    background: teamView ? '#4f46e5' : '#f9fafb',
                    color: teamView ? '#fff' : '#6b7280',
                  }}
                >
                  Team Reports
                </button>
              </div>
            )}

            {/* Student filter — only in my-reports mode (counselors only) */}
            {!teamView && !isStudent && (
              <select
                value={selectedStudentId ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : null
                  setSelectedStudentId(val)
                  setFormStudentId(val)
                  setSelectedReport(null)
                  setSentConfirm(null)
                  setListPage(0)
                }}
                style={{ ...inputSt }}
              >
                <option value="">— All students —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || s.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Report list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {teamView && teamReportsLoading ? (
              <p style={{ padding: '24px 16px', fontSize: '0.82rem', color: '#9ca3af', textAlign: 'center' }}>
                Loading team reports…
              </p>
            ) : activeReports.length === 0 ? (
              <p style={{ padding: '24px 16px', fontSize: '0.82rem', color: '#9ca3af', textAlign: 'center' }}>
                {isStudent
                  ? 'No session reports have been sent to you yet.'
                  : teamView
                    ? 'No team reports found.'
                    : selectedStudentId
                      ? 'No reports yet for this student.'
                      : 'Select a student to view their reports.'}
              </p>
            ) : (
              pagedReports.map((r) => {
                const student = students.find((s) => s.id === r.student_id)
                const isSelected = selectedReport?.id === r.id
                const isSent = Boolean(r.sent_at)
                return (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedReport(r); populateForm(r); setMobileShowDetail(true) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '12px 16px', border: 'none', borderBottom: '1px solid #f3f4f6',
                      borderLeft: isSelected ? '3px solid #4f46e5' : '3px solid transparent',
                      background: isSelected ? '#eef2ff' : 'transparent', cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = '#f9fafb' }}
                    onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Student name */}
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student?.full_name || student?.email || `Student #${r.student_id}`}
                    </div>
                    {/* Coach name */}
                    {r.coach_name && (
                      <div style={{ fontSize: '0.72rem', color: '#7c3aed', marginBottom: 2, fontWeight: 500 }}>
                        {r.coach_name}
                      </div>
                    )}
                    {/* Date */}
                    <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 4 }}>
                      {reportLabel(r)}
                    </div>
                    {/* Type + status row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                        {REPORT_TYPE_LABELS[r.report_type]}
                        {r.appointment_type ? ` · ${r.appointment_type}` : ''}
                      </span>
                      {isSent ? (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, color: '#15803d',
                          background: '#dcfce7', borderRadius: 20, padding: '2px 8px',
                          flexShrink: 0,
                        }}>
                          Sent
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 600, color: '#6b7280',
                          background: '#f3f4f6', borderRadius: 20, padding: '2px 8px',
                          flexShrink: 0,
                        }}>
                          Draft
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderTop: '1px solid #f3f4f6', flexShrink: 0,
              background: '#fff',
            }}>
              <button
                onClick={() => setListPage(p => Math.max(0, p - 1))}
                disabled={listPage === 0}
                style={{
                  padding: '4px 12px', fontSize: '0.78rem', border: '1px solid #e5e7eb',
                  borderRadius: 6, background: listPage === 0 ? '#f9fafb' : '#fff',
                  color: listPage === 0 ? '#d1d5db' : '#374151', cursor: listPage === 0 ? 'default' : 'pointer',
                }}
              >
                ← Prev
              </button>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {listPage + 1} / {totalPages}
                <span style={{ color: '#9ca3af', marginLeft: 4 }}>({activeReports.length} total)</span>
              </span>
              <button
                onClick={() => setListPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={listPage >= totalPages - 1}
                style={{
                  padding: '4px 12px', fontSize: '0.78rem', border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  background: listPage >= totalPages - 1 ? '#f9fafb' : '#fff',
                  color: listPage >= totalPages - 1 ? '#d1d5db' : '#374151',
                  cursor: listPage >= totalPages - 1 ? 'default' : 'pointer',
                }}
              >
                Next →
              </button>
            </div>
          )}
        </aside>

        {/* Right Panel — Report Form */}
        <main style={mainSt}>
          {/* Mobile back button — show whenever mobileShowDetail is true */}
          {mobileShowDetail && (
            <button
              onClick={() => setMobileShowDetail(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: '#4f46e5', marginBottom: 16, marginLeft: -4, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ← Back to list
            </button>
          )}
          <div style={{ maxWidth: 760, margin: '0 auto' }}>

            {/* Post-send green banner */}
            {sentBanner && (
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 8, padding: '12px 16px', marginBottom: 16,
                fontSize: '0.875rem', color: '#15803d', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ✓ {sentBanner}
              </div>
            )}

            {/* Team view read-only banner */}
            {teamView && selectedReport && (
              <div style={{
                background: '#f5f3ff', border: '1px solid #c4b5fd',
                borderRadius: 8, padding: '10px 16px', marginBottom: 16,
                fontSize: '0.82rem', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontWeight: 700 }}>Read-only view</span>
                {selectedReport.coach_name && <span>— authored by {selectedReport.coach_name}</span>}
              </div>
            )}

            {/* Sent read-only banner (own sent report) */}
            {isSentReport && !editResendMode && (
              <div style={{
                background: '#f9fafb', border: '1px solid #d1d5db',
                borderRadius: 8, padding: '10px 16px', marginBottom: 16,
                fontSize: '0.82rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  background: '#e5e7eb', color: '#374151', borderRadius: 4,
                  padding: '2px 10px', fontWeight: 700, fontSize: '0.78rem',
                }}>
                  Sent on {fmtDate(selectedReport?.sent_at?.slice(0, 10))}
                </span>
                <span>This report has been sent and is read-only.</span>
              </div>
            )}

            {/* Edit-resend mode banner */}
            {isSentReport && editResendMode && (
              <div style={{
                background: '#fffbeb', border: '1px solid #fcd34d',
                borderRadius: 8, padding: '10px 16px', marginBottom: 16,
                fontSize: '0.82rem', color: '#92400e', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                Editing sent report — click Save &amp; Resend when done.
              </div>
            )}

            {/* Report Type */}
            <div style={sectionSt}>
              <label style={labelSt}>Report Type</label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {(['single', 'multiple', 'note'] as const).map((t) => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: isReadOnly ? 'default' : 'pointer', fontSize: '0.875rem', color: '#374151' }}>
                    <input
                      type="radio"
                      name="report_type"
                      value={t}
                      checked={reportType === t}
                      onChange={() => { if (!isReadOnly) setReportType(t) }}
                      disabled={isReadOnly}
                      style={{ accentColor: '#4f46e5' }}
                    />
                    {REPORT_TYPE_LABELS[t]}
                  </label>
                ))}
              </div>
            </div>

            {/* Header fields */}
            <div style={sectionSt}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>

                {/* Student */}
                <div>
                  <label style={labelSt}>Student</label>
                  <select
                    value={formStudentId ?? ''}
                    onChange={(e) => { if (!isReadOnly) setFormStudentId(e.target.value ? parseInt(e.target.value, 10) : null) }}
                    disabled={isReadOnly}
                    style={isReadOnly ? inputDisabledSt : inputSt}
                  >
                    <option value="">— Select student —</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                    ))}
                  </select>
                </div>

                {/* Appointment Type — hidden for note */}
                {reportType !== 'note' && (
                  <div>
                    <label style={labelSt}>Appointment Type</label>
                    <select
                      value={appointmentType}
                      onChange={(e) => { if (!isReadOnly) setAppointmentType(e.target.value) }}
                      disabled={isReadOnly}
                      style={isReadOnly ? inputDisabledSt : inputSt}
                    >
                      {APPOINTMENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Single session fields */}
                {reportType === 'single' && (
                  <>
                    <div>
                      <label style={labelSt}>Date</label>
                      <input type="date" value={appointmentDate} onChange={(e) => { if (!isReadOnly) setAppointmentDate(e.target.value) }} readOnly={isReadOnly} style={isReadOnly ? inputDisabledSt : inputSt} />
                    </div>

                    <div>
                      <label style={labelSt}>Time</label>
                      <input type="time" value={appointmentTime} onChange={(e) => { if (!isReadOnly) setAppointmentTime(e.target.value) }} readOnly={isReadOnly} style={isReadOnly ? inputDisabledSt : inputSt} />
                    </div>
                    <div>
                      <label style={labelSt}>Duration (minutes)</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        {DURATION_PRESETS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => { if (!isReadOnly) setAppointmentDuration(d) }}
                            style={{
                              padding: '4px 10px', borderRadius: 6, border: '1px solid',
                              borderColor: appointmentDuration === d ? '#4f46e5' : '#e5e7eb',
                              background: appointmentDuration === d ? '#eef2ff' : '#fff',
                              color: appointmentDuration === d ? '#4f46e5' : '#6b7280',
                              fontSize: '0.78rem', cursor: isReadOnly ? 'default' : 'pointer', fontWeight: 600,
                            }}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        placeholder="Custom"
                        value={appointmentDuration}
                        onChange={(e) => { if (!isReadOnly) setAppointmentDuration(e.target.value ? parseInt(e.target.value, 10) : '') }}
                        readOnly={isReadOnly}
                        style={{ ...(isReadOnly ? inputDisabledSt : inputSt), width: 100 }}
                      />
                    </div>
                    <div>
                      <label style={labelSt}>Attended</label>
                      <select value={attended} onChange={(e) => { if (!isReadOnly) setAttended(e.target.value) }} disabled={isReadOnly} style={isReadOnly ? inputDisabledSt : inputSt}>
                        {ATTENDED_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Multiple sessions fields */}
                {reportType === 'multiple' && (
                  <>
                    <div>
                      <label style={labelSt}>Start Date</label>
                      <input type="date" value={startDate} onChange={(e) => { if (!isReadOnly) setStartDate(e.target.value) }} readOnly={isReadOnly} style={isReadOnly ? inputDisabledSt : inputSt} />
                    </div>
                    <div>
                      <label style={labelSt}>End Date</label>
                      <input type="date" value={endDate} onChange={(e) => { if (!isReadOnly) setEndDate(e.target.value) }} readOnly={isReadOnly} style={isReadOnly ? inputDisabledSt : inputSt} />
                    </div>
                    <div>
                      <label style={labelSt}>Total Time (minutes)</label>
                      <input
                        type="number"
                        value={totalDuration}
                        onChange={(e) => { if (!isReadOnly) setTotalDuration(e.target.value ? parseInt(e.target.value, 10) : '') }}
                        readOnly={isReadOnly}
                        style={{ ...(isReadOnly ? inputDisabledSt : inputSt), width: 120 }}
                      />
                    </div>
                  </>
                )}

                {/* Additional emails — hidden from students */}
                {!isStudent && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelSt}>Additional email addresses (comma-separated)</label>
                    <input
                      type="text"
                      value={additionalEmails}
                      onChange={(e) => { if (!isReadOnly) setAdditionalEmails(e.target.value) }}
                      readOnly={isReadOnly}
                      placeholder="parent@example.com, other@example.com"
                      style={isReadOnly ? inputDisabledSt : inputSt}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div style={sectionSt}>
              {/* Raw notes — hidden from students */}
              {!isStudent && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelSt}>Session notes (internal — not shared)</label>
                  <textarea
                    value={rawNotes}
                    onChange={(e) => { if (!isReadOnly) setRawNotes(e.target.value) }}
                    readOnly={isReadOnly}
                    rows={6}
                    placeholder="Type notes during the meeting…"
                    style={{ ...(isReadOnly ? inputDisabledSt : inputSt), resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              )}

              {/* Otter transcript collapsible — hidden in team view and sent read-only */}
              {!isReadOnly && (
                <div style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => setShowOtter((v) => !v)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '0.82rem', color: '#6b7280', padding: 0, fontWeight: 600,
                    }}
                  >
                    {showOtter ? '▾ Hide Otter transcript' : '▸ Paste Otter transcript to draft with AI'}
                  </button>
                  {showOtter && (
                    <textarea
                      value={otterTranscript}
                      onChange={(e) => setOtterTranscript(e.target.value)}
                      rows={8}
                      placeholder="Paste meeting transcript here…"
                      style={{ ...inputSt, marginTop: 8, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.78rem' }}
                    />
                  )}
                </div>
              )}

              {/* AI Draft button — hidden in read-only */}
              {!isReadOnly && (rawNotes || otterTranscript) && (
                <button
                  type="button"
                  onClick={handleDraft}
                  disabled={drafting}
                  style={{
                    background: drafting ? '#c7d2fe' : '#4f46e5',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px 18px', fontSize: '0.875rem', fontWeight: 600,
                    cursor: drafting ? 'wait' : 'pointer', marginBottom: 20,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {drafting ? (
                    <>
                      <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      Drafting…
                    </>
                  ) : '✨ Draft with AI'}
                </button>
              )}

              {/* Shared notes */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelSt}>Shared notes (sent to student &amp; parent)</label>
                <textarea
                  value={sharedNotes}
                  onChange={(e) => { if (!isReadOnly) setSharedNotes(e.target.value) }}
                  readOnly={isReadOnly}
                  rows={10}
                  placeholder="Notes that will be emailed to the student (and parent if enabled)…"
                  style={{ ...(isReadOnly ? inputDisabledSt : inputSt), resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                />
              </div>

              {/* Internal notes — hidden from students */}
              {!isStudent && (
                <div>
                  <label style={labelSt}>Internal notes (coach &amp; team only)</label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => { if (!isReadOnly) setInternalNotes(e.target.value) }}
                    readOnly={isReadOnly}
                    rows={5}
                    placeholder="Private notes for the coach and team lead — never shared…"
                    style={{ ...(isReadOnly ? inputDisabledSt : inputSt), resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}

            {/* Case 1: Sent report — read-only, show Resend + Edit & Resend (counselors only) */}
            {!isStudent && isSentReport && !editResendMode && !teamView && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  style={{
                    background: '#fff', color: '#374151',
                    border: '1px solid #d1d5db', borderRadius: 8,
                    padding: '9px 18px', fontSize: '0.875rem',
                    fontWeight: 600, cursor: resending ? 'wait' : 'pointer',
                  }}
                >
                  {resending ? 'Resending…' : 'Resend'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditResendMode(true)}
                  style={{
                    background: '#4f46e5', color: '#fff',
                    border: 'none', borderRadius: 8,
                    padding: '9px 18px', fontSize: '0.875rem',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Edit &amp; Resend
                </button>
                {resendConfirm && (
                  <span style={{
                    fontSize: '0.875rem',
                    color: resendConfirm.startsWith('Resent') ? '#15803d' : '#dc2626',
                    fontWeight: 600,
                  }}>
                    {resendConfirm.startsWith('Resent') ? '✓ ' : '✗ '}{resendConfirm}
                  </span>
                )}
              </div>
            )}

            {/* Case 2: Edit-resend mode — show Save & Resend (counselors only) */}
            {!isStudent && isSentReport && editResendMode && !teamView && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                <button
                  type="button"
                  onClick={handleSaveResend}
                  disabled={saveResending}
                  style={{
                    background: saveResending ? '#d97706' : '#b45309',
                    color: '#fff', border: 'none',
                    borderRadius: 8, padding: '9px 18px', fontSize: '0.875rem',
                    fontWeight: 600, cursor: saveResending ? 'wait' : 'pointer',
                  }}
                >
                  {saveResending ? 'Saving & Sending…' : 'Save & Resend'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditResendMode(false)}
                  style={{
                    background: '#fff', color: '#6b7280',
                    border: '1px solid #d1d5db', borderRadius: 8,
                    padding: '9px 18px', fontSize: '0.875rem',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Case 3: Draft / new report — show Save Draft + Save & Send (counselors only) */}
            {!isStudent && !isSentReport && !teamView && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                <button
                  type="button"
                  onClick={() => saveDraft()}
                  disabled={saving}
                  style={{
                    background: '#fff', color: '#374151', border: '1px solid #d1d5db',
                    borderRadius: 8, padding: '9px 18px', fontSize: '0.875rem',
                    fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={saving || sending}
                  style={{
                    background: (saving || sending) ? '#d97706' : '#b45309',
                    color: '#fff', border: 'none',
                    borderRadius: 8, padding: '9px 18px', fontSize: '0.875rem',
                    fontWeight: 600, cursor: (saving || sending) ? 'wait' : 'pointer',
                  }}
                >
                  {sending ? 'Sending…' : 'Save & Send'}
                </button>

                {selectedReport && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{
                      background: '#fff', color: '#dc2626', border: '1px solid #fca5a5',
                      borderRadius: 8, padding: '9px 18px', fontSize: '0.875rem',
                      fontWeight: 600, cursor: 'pointer', marginLeft: 'auto',
                    }}
                  >
                    Delete
                  </button>
                )}

                {/* Save Draft inline feedback */}
                {saveMsg && (
                  <span style={{
                    fontSize: '0.875rem',
                    color: saveMsg.includes('fail') || saveMsg.includes('error') || saveMsg.includes('Select') ? '#dc2626' : '#6b7280',
                  }}>
                    {saveMsg}
                  </span>
                )}
              </div>
            )}

            {/* Send error feedback */}
            {!teamView && sentConfirm && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8, padding: '12px 16px', fontSize: '0.875rem',
                color: '#dc2626', marginBottom: 16,
              }}>
                ✗ {sentConfirm}
              </div>
            )}

          </div>
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af' }}>Loading…</div>}>
      <ReportsContent />
    </Suspense>
  )
}
