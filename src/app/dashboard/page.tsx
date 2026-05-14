'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import SafetyEventModal from '@/components/safety/SafetyEventModal'
import AddFamilyModal from '@/components/counselor/AddFamilyModal'

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface DashboardStudent {
  id: number
  full_name: string
  preferred_name?: string
  email: string
  graduation_year?: number
  high_school_name?: string
  gpa_weighted?: number
  sat_total?: number
  act_composite?: number
  start_date?: string
  expected_end_date?: string
  actual_end_date?: string
  engagement_type?: string
  primary_contact?: string
  billing_status?: string
  archived: boolean
  archived_at?: string
  weekly_digest_enabled: boolean
  notify_parent_session_reports: boolean
  overall_status?: string
  essay_status?: string
  testing_status?: string
  next_test_date?: string
  coaching_package_name?: string
  scheduling_link?: string
  financial_aid?: boolean
  dashboard_notes?: string
  next_deadline?: string
  deadline_status?: string
  college_list_count: number
  last_login?: string
  has_safety_flag?: boolean
  clerk_user_id?: string | null
  invite_url?: string | null
  assigned_counselor?: string | null
  actual_counselor_id?: number | null
}

// ── Label maps ────────────────────────────────────────────────────────────────

const OVERALL_LABELS: Record<string, string> = {
  green: 'On Track', yellow: 'Needs Attention', red: 'At Risk',
}
const ESSAY_LABELS: Record<string, string> = {
  on_track: 'On Track', behind: 'Behind', very_behind: 'Very Behind',
}
const TESTING_LABELS: Record<string, string> = {
  plan_to_take_retake: 'Plans to Take / Retake',
  testing_complete:    'Testing Complete',
  no_plan:             'No Plan to Test',
}
const ENGAGEMENT_LABELS: Record<string, string> = {
  not_a_client_yet: 'Not a coaching client yet',
  comprehensive:    'Comprehensive client',
  stay_on_track:    'Stay on track client',
  hourly_on_demand: 'Hourly / On-Demand client',
  test_prep:        'Test-prep client',
  essay:            'Essay client',
}
const BILLING_LABELS: Record<string, string> = {
  current: 'Current', overdue: 'Overdue', comped: "Comp'd", paused: 'Paused',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(s?: string) {
  if (s === 'green')  return 'bg-green-100 text-green-800'
  if (s === 'yellow') return 'bg-yellow-100 text-yellow-800'
  if (s === 'red')    return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-500'
}

function essayColor(s?: string) {
  if (s === 'on_track')   return 'bg-green-100 text-green-800'
  if (s === 'behind')     return 'bg-yellow-100 text-yellow-800'
  if (s === 'very_behind') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-500'
}

function deadlineDot(s?: string) {
  if (s === 'red')    return 'bg-red-500'
  if (s === 'yellow') return 'bg-yellow-400'
  if (s === 'green')  return 'bg-green-500'
  return 'bg-gray-300'
}

function fmtDate(d?: string) {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function relativeTime(d?: string) {
  if (!d) return '—'
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return `${Math.floor(diff / 30)}mo ago`
}

// ── Edit Panel sub-components (defined outside EditPanel to prevent remount on each keystroke) ──

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

function PanelSelect({ field, options, placeholder = 'Not set', form, set }: {
  field: keyof DashboardStudent
  options: Record<string, string>
  placeholder?: string
  form: Partial<DashboardStudent>
  set: (k: keyof DashboardStudent, v: unknown) => void
}) {
  return (
    <select
      value={(form[field] as string) || ''}
      onChange={e => set(field, e.target.value || null)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">{placeholder}</option>
      {Object.entries(options).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  )
}

function DateInput({ field, form, set }: {
  field: keyof DashboardStudent
  form: Partial<DashboardStudent>
  set: (k: keyof DashboardStudent, v: unknown) => void
}) {
  return (
    <input
      type="date"
      value={(form[field] as string)?.slice(0, 10) || ''}
      onChange={e => set(field, e.target.value || null)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

// ── Edit Panel ────────────────────────────────────────────────────────────────

function EditPanel({
  student, onClose, onSave, getToken,
}: {
  student: DashboardStudent
  onClose: () => void
  onSave: (updated: DashboardStudent) => void
  getToken: () => Promise<string | null>
}) {
  const [form, setForm] = useState<Partial<DashboardStudent>>({ ...student })
  const [saving, setSaving] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(student.invite_url ?? null)
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Writing section enrollment state
  const [writingSections, setWritingSections] = useState<{key: string; title: string}[]>([])
  const [enrolledSections, setEnrolledSections] = useState<Set<string>>(new Set())
  const [enrollmentLoading, setEnrollmentLoading] = useState(true)

  useEffect(() => {
    async function fetchWritingSections() {
      try {
        const token = await getToken()
        const res = await fetch(`${apiUrl}/writing/sections?student_id=${student.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setWritingSections((data.sections || []).map((s: {key: string; title: string}) => ({ key: s.key, title: s.title })))
          const enrolled = new Set<string>(
            (data.sections || []).filter((s: {enrolled?: boolean}) => s.enrolled).map((s: {key: string}) => s.key)
          )
          setEnrolledSections(enrolled)
        }
      } catch { /* ignore */ }
      finally { setEnrollmentLoading(false) }
    }
    fetchWritingSections()
  }, [student.id, getToken])

  const toggleEnrollment = async (sectionKey: string, enroll: boolean) => {
    const prev = new Set(enrolledSections)
    // Optimistic update
    if (enroll) {
      setEnrolledSections(s => { const n = new Set(s); n.add(sectionKey); return n })
    } else {
      setEnrolledSections(s => { const n = new Set(s); n.delete(sectionKey); return n })
    }
    try {
      const token = await getToken()
      await fetch(`${apiUrl}/writing/enroll`, {
        method: enroll ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id, section_key: sectionKey }),
      })
    } catch {
      // Revert on error
      setEnrolledSections(prev)
    }
  }

  const set = (k: keyof DashboardStudent, v: unknown) =>
    setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/counselor/dashboard/students/${student.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        // Merge form state back into parent — backend returns {ok:true}, not the
        // updated row, so use form (which has the user's edits) to update the list.
        onSave({ ...student, ...form } as DashboardStudent)
      }
    } finally {
      setSaving(false)
    }
  }

  const generateInvite = async (regenerate = false) => {
    setInviteLoading(true)
    try {
      const token = await getToken()
      const url = regenerate
        ? `${apiUrl}/counselor/dashboard/invite/${student.id}/regenerate`
        : `${apiUrl}/counselor/dashboard/invite/${student.id}`
      const method = regenerate ? 'POST' : 'GET'
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setInviteUrl(data.invite_url)
        setInviteExpiry(data.expires_at)
      }
    } finally {
      setInviteLoading(false)
    }
  }

  const copyInvite = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{student.full_name}</h2>
            <p className="text-xs text-gray-500">{student.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* Overview */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Overview</h3>
            {student.assigned_counselor && (
              <Field label="Assigned Coach">
                <p className="text-sm text-gray-700 py-1.5">{student.assigned_counselor}</p>
              </Field>
            )}
            <Field label="Overall Status">
              <PanelSelect form={form} set={set} field="overall_status" options={OVERALL_LABELS} />
            </Field>
            <Field label="Essay Status">
              <PanelSelect form={form} set={set} field="essay_status" options={ESSAY_LABELS} />
            </Field>
            <Field label="Testing Status">
              <PanelSelect form={form} set={set} field="testing_status" options={TESTING_LABELS} />
            </Field>
            <Field label="Next Test Date"><DateInput form={form} set={set} field="next_test_date" /></Field>
            <Field label="">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.financial_aid}
                  onChange={e => set('financial_aid', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Applying for financial aid</span>
              </label>
            </Field>
          </section>

          {/* Engagement */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Engagement</h3>
            <Field label="Engagement Type">
              <PanelSelect form={form} set={set} field="engagement_type" options={ENGAGEMENT_LABELS} />
            </Field>
            <Field label="Package Name">
              <input
                type="text"
                value={(form.coaching_package_name as string) || ''}
                onChange={e => set('coaching_package_name', e.target.value || null)}
                placeholder="e.g. Diamond Package"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="Primary Contact">
              <PanelSelect form={form} set={set} field="primary_contact" options={{ student: 'Student', parent: 'Parent' }} />
            </Field>
            <Field label="Start Date"><DateInput form={form} set={set} field="start_date" /></Field>
            <Field label="Expected End Date"><DateInput form={form} set={set} field="expected_end_date" /></Field>
            <Field label="Actual End Date"><DateInput form={form} set={set} field="actual_end_date" /></Field>
            <Field label="Billing Status">
              <PanelSelect form={form} set={set} field="billing_status" options={BILLING_LABELS} />
            </Field>
          </section>

          {/* Communications */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Communications</h3>
            <Field label="">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.weekly_digest_enabled}
                  onChange={e => set('weekly_digest_enabled', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Send weekly deadline digest</span>
              </label>
            </Field>
            <Field label="">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notify_parent_session_reports !== false}
                  onChange={async e => {
                    const enabled = e.target.checked
                    set('notify_parent_session_reports', enabled)
                    try {
                      const token = await getToken()
                      await fetch(`${apiUrl}/students/${student.id}/notify-parent-session-reports`, {
                        method: 'PATCH',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled }),
                      })
                    } catch { /* ignore */ }
                  }}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Notify parent of session reports</span>
              </label>
            </Field>
            <Field label="Scheduling Link (override)">
              <input
                type="url"
                value={(form.scheduling_link as string) || ''}
                onChange={e => set('scheduling_link', e.target.value || null)}
                placeholder="https://calendly.com/…"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Overrides the default scheduling link for this student only.</p>
            </Field>
          </section>

          {/* Writing & Essays Access */}
          {writingSections.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Writing &amp; Essays</h3>
            <p className="text-xs text-gray-400 mb-3">Check the sections this student can access.</p>
            {enrollmentLoading ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : (
              <div className="space-y-1.5">
                {writingSections.map(s => (
                  <label key={s.key} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={enrolledSections.has(s.key)}
                      onChange={e => toggleEnrollment(s.key, e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{s.title}</span>
                  </label>
                ))}
              </div>
            )}
          </section>
          )}

          {/* Notes */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Notes</h3>
            <textarea
              value={(form.dashboard_notes as string) || ''}
              onChange={e => set('dashboard_notes', e.target.value)}
              rows={4}
              placeholder="Private counselor notes…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </section>

          {/* Invite — only show for pending (not yet signed-up) students */}
          {!student.clerk_user_id && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Invite Link</h3>
            {inviteUrl ? (
              <div className="space-y-2">
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 break-all font-mono">
                  {inviteUrl}
                </div>
                {inviteExpiry && (
                <p className="text-xs text-gray-400">
                  Expires {fmtDate(inviteExpiry)}
                </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={copyInvite}
                    className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={() => generateInvite(true)}
                    disabled={inviteLoading}
                    className="px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => generateInvite(false)}
                disabled={inviteLoading}
                className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                {inviteLoading ? 'Generating…' : 'Generate Invite Link'}
              </button>
            )}
          </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          <button
            onClick={save}
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            onClick={async () => {
              const nowArchived = !form.archived
              const updated = { ...form, archived: nowArchived, archived_at: nowArchived ? new Date().toISOString() : undefined }
              setForm(updated)
              setSaving(true)
              try {
                const token = await getToken()
                const res = await fetch(`${apiUrl}/counselor/dashboard/students/${student.id}`, {
                  method: 'PATCH',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ archived: nowArchived }),
                })
                if (res.ok) {
                  const data = await res.json()
                  onSave({ ...student, ...data, archived: nowArchived })
                }
              } finally {
                setSaving(false)
              }
            }}
            disabled={saving}
            className={`w-full px-4 py-2 text-sm font-medium rounded-lg border disabled:opacity-50 ${
              form.archived
                ? 'border-green-300 text-green-700 hover:bg-green-50'
                : 'border-red-200 text-red-600 hover:bg-red-50'
            }`}
          >
            {form.archived ? 'Unarchive Student' : 'Archive Student'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { getToken } = useAuth()

  const [students, setStudents]     = useState<DashboardStudent[]>([])
  const [loading, setLoading]       = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [filter, setFilter]         = useState<'active' | 'archived' | 'all'>('active')
  const [search, setSearch]         = useState('')
  const [sortKey, setSortKey]       = useState<keyof DashboardStudent>('full_name')
  const [sortAsc, setSortAsc]       = useState(true)
  const [selected, setSelected]     = useState<Set<number>>(new Set())
  const [editStudent, setEditStudent] = useState<DashboardStudent | null>(null)
  const [safetyStudent, setSafetyStudent] = useState<DashboardStudent | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [archiving, setArchiving]   = useState(false)
  const [addFamilyOpen, setAddFamilyOpen] = useState(false)
  const [tenantCounselors, setTenantCounselors] = useState<{id: number; full_name: string}[] | null>(null)

  // Try to load counselors for tenant-admin mode. 403 = regular counselor, ignore.
  useEffect(() => {
    async function fetchCounselors() {
      try {
        const token = await getToken()
        const res = await fetch(`${apiUrl}/tenant-admin/counselors`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setTenantCounselors(data.counselors || [])
        }
      } catch {
        // ignore — not a tenant admin
      }
    }
    fetchCounselors()
  }, [getToken])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const param = filter === 'active' ? 'false' : filter === 'archived' ? 'true' : 'all'
      const res = await fetch(`${apiUrl}/counselor/dashboard/students?archived=${param}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 403 || res.status === 401) {
        setAccessDenied(true)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
      }
    } finally {
      setLoading(false)
    }
  }, [filter, getToken])

  useEffect(() => { load() }, [load])

  // Filter + sort
  const displayed = useMemo(() => {
    let rows = [...students]
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        (s.high_school_name || '').toLowerCase().includes(q)
      )
    }
    rows.sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })
    return rows
  }, [students, search, sortKey, sortAsc])

  const toggleSort = (key: keyof DashboardStudent) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === displayed.length) setSelected(new Set())
    else setSelected(new Set(displayed.map(s => s.id)))
  }

  const bulkArchive = async () => {
    setArchiving(true)
    try {
      const token = await getToken()
      await fetch(`${apiUrl}/counselor/dashboard/students/bulk-archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: Array.from(selected) }),
      })
      setSelected(new Set())
      setArchiveConfirm(false)
      load()
    } finally {
      setArchiving(false)
    }
  }

  const archiveSingle = async (s: DashboardStudent) => {
    const token = await getToken()
    await fetch(`${apiUrl}/counselor/dashboard/students/${s.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    })
    load()
  }

  const Th = ({ label, field }: { label: string; field?: keyof DashboardStudent }) => (
    <th
      onClick={() => field && toggleSort(field)}
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap
        ${field ? 'cursor-pointer hover:text-gray-700 select-none' : ''}`}
    >
      {label}
      {field && sortKey === field && (
        <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>
      )}
    </th>
  )

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Counselor Access Only</h1>
          <p className="text-gray-500 text-sm">
            The Student Dashboard is available to counselors and admins.
            If you&apos;re a student, your counselor manages this view on your behalf.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav bar — matches profile/lists pages */}
      <header style={{ background: '#0c1b33', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="px-4 sm:px-6 py-3">
        <Link href="/" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
          <span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr
        </Link>
        <Link href="/chat" style={{ fontSize: '0.82rem', color: '#8888aa', textDecoration: 'none', border: '1px solid #444466', padding: '4px 12px', borderRadius: 6 }}>
          ← Back to Soar
        </Link>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your students, track progress, and generate invite links.</p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Active/Archived toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            {(['active', 'archived', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setSelected(new Set()) }}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors
                  ${filter === f
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by name or school…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Add Family */}
          <button
            onClick={() => setAddFamilyOpen(true)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Add Family
          </button>

          {/* Bulk archive */}
          {selected.size > 0 && (
            <button
              onClick={() => setArchiveConfirm(true)}
              className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              Archive Selected ({selected.size})
            </button>
          )}
        </div>

        {/* Student list — cards on mobile, table on desktop */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
          ) : displayed.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              {filter === 'active'
                ? "No active students. Switch to 'All' to see archived students."
                : filter === 'archived'
                ? 'No archived students.'
                : 'No students found.'}
            </div>
          ) : (
            <>
              {/* ── Mobile card list (hidden on md+) ── */}
              <div className="md:hidden divide-y divide-gray-100">
                {displayed.map(s => (
                  <div key={s.id} className={`px-4 py-4 ${selected.has(s.id) ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: checkbox + name */}
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="rounded mt-0.5 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 flex items-center gap-1.5 flex-wrap">
                            {s.has_safety_flag && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSafetyStudent(s) }}
                                title="View unacknowledged safety event"
                                className="text-base leading-none flex-shrink-0"
                              >🚩</button>
                            )}
                            <span>{s.full_name}</span>
                            {s.preferred_name && s.preferred_name !== s.full_name.split(' ')[0] && (
                              <span className="text-gray-400 font-normal text-sm">({s.preferred_name})</span>
                            )}
                            {!s.clerk_user_id && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                                Invited
                                {s.invite_url && (
                                  <button
                                    title="Copy invite link"
                                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(s.invite_url!); }}
                                    className="hover:text-amber-800"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" /><path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" /></svg>
                                  </button>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{s.high_school_name || s.email}</div>
                          {s.assigned_counselor && (
                            <div className="text-xs text-blue-500 mt-0.5">Coach: {s.assigned_counselor}</div>
                          )}
                          {/* Status badges */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {s.overall_status && (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(s.overall_status)}`}>
                                {OVERALL_LABELS[s.overall_status] || s.overall_status}
                              </span>
                            )}
                            {s.essay_status && (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${essayColor(s.essay_status)}`}>
                                Essay: {ESSAY_LABELS[s.essay_status] || s.essay_status}
                              </span>
                            )}
                          </div>
                          {/* Next deadline */}
                          {s.next_deadline && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${deadlineDot(s.deadline_status)}`} />
                              Next deadline: {fmtDate(s.next_deadline)}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Right: Edit button always visible */}
                      <button
                        onClick={() => setEditStudent(s)}
                        className="flex-shrink-0 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Desktop table (hidden on mobile) ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selected.size === displayed.length && displayed.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <Th label="Name"         field="full_name" />
                      <Th label="High School"  field="high_school_name" />
                      <Th label="Grad Year"    field="graduation_year" />
                      <Th label="Next Deadline" field="next_deadline" />
                      <Th label="Overall"      field="overall_status" />
                      <Th label="Essay"        field="essay_status" />
                      <Th label="Last Login"   field="last_login" />
                      <Th label="End Date"     field="expected_end_date" />
                      <Th label="Actions" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayed.map(s => (
                      <tr
                        key={s.id}
                        className={`hover:bg-gray-50 transition-colors ${selected.has(s.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(s.id)}
                            onChange={() => toggleSelect(s.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 flex items-center gap-1.5 flex-wrap">
                            {s.has_safety_flag && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSafetyStudent(s) }}
                                title="View unacknowledged safety event"
                                className="text-base leading-none flex-shrink-0 hover:scale-110 transition-transform px-1 py-0.5 rounded hover:bg-red-50"
                              >🚩</button>
                            )}
                            {s.full_name}
                            {s.preferred_name && s.preferred_name !== s.full_name.split(' ')[0] && (
                              <span className="text-gray-400 font-normal"> ({s.preferred_name})</span>
                            )}
                            {!s.clerk_user_id && (
                              <span className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                                Invited
                                {s.invite_url && (
                                  <button
                                    title="Copy invite link"
                                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(s.invite_url!); }}
                                    className="hover:text-amber-800"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" /><path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" /></svg>
                                  </button>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{s.email}</div>
                          {s.assigned_counselor && (
                            <div className="text-xs text-blue-500 mt-0.5">Coach: {s.assigned_counselor}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.high_school_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{s.graduation_year || '—'}</td>
                        <td className="px-4 py-3">
                          {s.next_deadline ? (
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${deadlineDot(s.deadline_status)}`} />
                              <span className="text-gray-700">{fmtDate(s.next_deadline)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {s.overall_status ? (
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColor(s.overall_status)}`}>
                              {OVERALL_LABELS[s.overall_status] || s.overall_status}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {s.essay_status ? (
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${essayColor(s.essay_status)}`}>
                              {ESSAY_LABELS[s.essay_status] || s.essay_status}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{relativeTime(s.last_login)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(s.expected_end_date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditStudent(s)}
                              className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
                            >
                              Edit
                            </button>
                            {!s.archived && (
                              <button
                                onClick={() => archiveSingle(s)}
                                className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-amber-50 text-amber-600 border-amber-200"
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Summary */}
        {!loading && (
          <p className="text-xs text-gray-400 mt-3">
            {displayed.length} student{displayed.length !== 1 ? 's' : ''}
            {search ? ' matching search' : ''}
          </p>
        )}
      </div>

      {/* Safety event modal */}
      {safetyStudent && (
        <SafetyEventModal
          student={safetyStudent}
          onClose={() => setSafetyStudent(null)}
          onAllAcknowledged={(studentId) => {
            setStudents(prev => prev.map(s =>
              s.id === studentId ? { ...s, has_safety_flag: false } : s
            ))
            setSafetyStudent(null)
          }}
          getToken={getToken}
        />
      )}

      {/* Edit panel */}
      {editStudent && (
        <EditPanel
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onSave={updated => {
            setStudents(prev => prev.map(s => s.id === updated.id ? updated : s))
            setEditStudent(null)
          }}
          getToken={getToken}
        />
      )}

      {/* Bulk archive confirmation */}
      {archiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setArchiveConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-900 mb-2">Archive {selected.size} student{selected.size !== 1 ? 's' : ''}?</h3>
            <p className="text-sm text-gray-500 mb-6">
              They will be hidden from your active list but all their data will be preserved.
              You can view them by switching to the Archived filter.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setArchiveConfirm(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={bulkArchive}
                disabled={archiving}
                className="flex-1 px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {archiving ? 'Archiving…' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Family modal — key forces remount once counselors load so useState initializes correctly */}
      <AddFamilyModal
        key={tenantCounselors ? 'ta' : 'c'}
        open={addFamilyOpen}
        onClose={() => setAddFamilyOpen(false)}
        onSuccess={load}
        counselors={tenantCounselors && tenantCounselors.length > 0 ? tenantCounselors : undefined}
      />
    </div>
  )
}
