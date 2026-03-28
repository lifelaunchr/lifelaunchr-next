'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Types ─────────────────────────────────────────────────────────────────────

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
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return `${Math.floor(diff / 30)}mo ago`
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
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)

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
        const data = await res.json()
        onSave({ ...student, ...data })
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

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      {children}
    </div>
  )

  const Select = ({ field, options, placeholder = 'Not set' }: {
    field: keyof DashboardStudent
    options: Record<string, string>
    placeholder?: string
  }) => (
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

  const DateInput = ({ field }: { field: keyof DashboardStudent }) => (
    <input
      type="date"
      value={(form[field] as string)?.slice(0, 10) || ''}
      onChange={e => set(field, e.target.value || null)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )

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
            <Field label="Overall Status">
              <Select field="overall_status" options={OVERALL_LABELS} />
            </Field>
            <Field label="Essay Status">
              <Select field="essay_status" options={ESSAY_LABELS} />
            </Field>
            <Field label="Testing Status">
              <Select field="testing_status" options={TESTING_LABELS} />
            </Field>
            <Field label="Next Test Date"><DateInput field="next_test_date" /></Field>
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
              <Select field="engagement_type" options={ENGAGEMENT_LABELS} />
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
              <Select field="primary_contact" options={{ student: 'Student', parent: 'Parent' }} />
            </Field>
            <Field label="Start Date"><DateInput field="start_date" /></Field>
            <Field label="Expected End Date"><DateInput field="expected_end_date" /></Field>
            <Field label="Actual End Date"><DateInput field="actual_end_date" /></Field>
            <Field label="Billing Status">
              <Select field="billing_status" options={BILLING_LABELS} />
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

          {/* Invite */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Invite Link</h3>
            {inviteUrl ? (
              <div className="space-y-2">
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 break-all font-mono">
                  {inviteUrl}
                </div>
                <p className="text-xs text-gray-400">
                  Expires {inviteExpiry ? fmtDate(inviteExpiry) : '—'}
                </p>
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
            onClick={() => {
              const nowArchived = !form.archived
              set('archived', nowArchived)
              if (!nowArchived) set('archived_at', null)
            }}
            className={`w-full px-4 py-2 text-sm font-medium rounded-lg border ${
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
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [archiving, setArchiving]   = useState(false)

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
      <div className="max-w-screen-xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
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
            className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

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

        {/* Table */}
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
            <div className="overflow-x-auto">
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
                      className={`hover:bg-gray-50 transition-colors
                        ${selected.has(s.id) ? 'bg-blue-50' : ''}`}
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
                        <div className="font-medium text-gray-900">
                          {s.full_name}
                          {s.preferred_name && s.preferred_name !== s.full_name.split(' ')[0] && (
                            <span className="text-gray-400 font-normal"> ({s.preferred_name})</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{s.email}</div>
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
    </div>
  )
}
