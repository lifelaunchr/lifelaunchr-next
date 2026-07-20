'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

interface CounselorOption { id: number; full_name: string }
interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  counselors: CounselorOption[]
}

interface PreviewRow {
  student_full_name?: string | null
  student_email?: string | null
  parent1_name?: string | null
  parent1_email?: string | null
  parent2_name?: string | null
  parent2_email?: string | null
  graduation_year?: number | null
  engagement_type?: string | null
  coaching_package_name?: string | null
  start_date?: string | null
  expected_end_date?: string | null
  essay_list_enabled?: boolean | null
  commonapp_enabled?: boolean | null
  uc_piqs_enabled?: boolean | null
  why_essays_enabled?: boolean | null
  editate_enabled?: boolean | null
  assigned_counselor?: string | null
  _issues?: string[]
}
interface ColMap { source: string; field: string }
interface Capacity {
  tenant_active: number
  tenant_limit: number | null
  import_count: number
  projected: number
  fits: boolean
  students_needed: number
  is_paid: boolean
  path: 'billing' | 'upgrade'
}
interface Preview {
  column_mapping: ColMap[]
  rows: PreviewRow[]
  row_count: number
  truncated: boolean
  max_rows: number
  capacity: Capacity
}

type RowStatus = 'pending' | 'working' | 'created' | 'linked' | 'error'
interface RowProgress { status: RowStatus; message?: string }

const ENGAGEMENT_TYPES = [
  { value: '', label: '— none —' },
  { value: 'not_a_client_yet', label: 'Not a client yet' },
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'stay_on_track', label: 'Stay on Track' },
  { value: 'hourly_on_demand', label: 'Hourly / On Demand' },
  { value: 'test_prep', label: 'Test Prep' },
  { value: 'essay', label: 'Essay' },
]

const ESSAY_FLAGS = [
  { field: 'essay_list_enabled', label: 'Essay List', module: 'essay_list' },
  { field: 'commonapp_enabled', label: 'CommonApp Essay', module: 'commonapp_essays' },
  { field: 'uc_piqs_enabled', label: 'UC Personal Insight Questions', module: 'uc_piqs' },
  { field: 'why_essays_enabled', label: 'Why Major / Why College Essays', module: 'why_essays' },
] as const
type EssayFlagKey = 'essay_list_enabled' | 'commonapp_enabled' | 'uc_piqs_enabled' | 'why_essays_enabled'

const WRITING_SECTIONS = [
  { key: 'self_discovery', title: 'Self-Discovery Journey', module: 'writing_self_discovery' },
  { key: 'writing_practice', title: 'Writing Practice', module: 'writing_practice' },
] as const

const FIELD_LABELS: Record<string, string> = {
  student_full_name: 'Student name',
  student_email: 'Student email',
  parent1_name: 'Parent 1 name',
  parent1_email: 'Parent 1 email',
  parent2_name: 'Parent 2 name',
  parent2_email: 'Parent 2 email',
  graduation_year: 'Graduation year',
  engagement_type: 'Engagement type',
  coaching_package_name: 'Coaching package',
  start_date: 'Start date',
  expected_end_date: 'Expected end date',
  assigned_counselor: 'Assigned counselor',
  ignored: 'Ignored',
}

export default function ImportFamiliesModal({ open, onClose, onSuccess, counselors }: Props) {
  const { getToken } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'map' | 'review'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string>('')

  const [preview, setPreview] = useState<Preview | null>(null)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [progress, setProgress] = useState<Record<number, RowProgress>>({})
  const [committing, setCommitting] = useState(false)
  const [done, setDone] = useState(false)

  // ── Tenant modules ─────────────────────────────────────────────────────────
  const [tenantModules, setTenantModules] = useState<string[]>([])
  useEffect(() => {
    fetch(API + '/tenant-config')
      .then(r => r.json())
      .then(d => setTenantModules(d.enabled_modules || []))
      .catch(() => {})
  }, [])
  const hasModule = (k: string) => tenantModules.includes(k)

  // ── Shared defaults ────────────────────────────────────────────────────────
  const [defCounselorId, setDefCounselorId] = useState<number | null>(counselors[0]?.id ?? null)
  const [defEngagement, setDefEngagement] = useState('')
  const [defPackage, setDefPackage] = useState('')
  const [defStart, setDefStart] = useState('')
  const [defEnd, setDefEnd] = useState('')
  const [defEssay, setDefEssay] = useState<Record<EssayFlagKey, boolean>>({
    essay_list_enabled: false,
    commonapp_enabled: false,
    uc_piqs_enabled: false,
    why_essays_enabled: false,
  })
  const [defEditate, setDefEditate] = useState(false)
  const [defWriting, setDefWriting] = useState<Record<string, boolean>>({
    self_discovery: true,
    writing_practice: true,
  })

  useEffect(() => {
    if (counselors[0] && defCounselorId == null) setDefCounselorId(counselors[0].id)
  }, [counselors, defCounselorId])

  const resetAll = () => {
    setStep('upload'); setFile(null); setAnalyzing(false); setError('')
    setPreview(null); setRows([]); setProgress({}); setCommitting(false); setDone(false)
  }
  const close = () => { resetAll(); onClose() }

  if (!open) return null

  // ── Step 1: analyze ────────────────────────────────────────────────────────
  const analyze = async () => {
    if (!file) { setError('Choose a CSV file first.'); return }
    setError(''); setAnalyzing(true)
    try {
      const token = await getToken()
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(API + '/tenant-admin/families/import-preview', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: fd,
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(typeof d.detail === 'string' ? d.detail : 'Could not read that file (error ' + res.status + ')')
      }
      const data: Preview = await res.json()
      setPreview(data)
      setRows(data.rows || [])
      setStep('map')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong analyzing the file.')
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Row helpers ────────────────────────────────────────────────────────────
  const setRow = (i: number, patch: Partial<PreviewRow>) =>
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const resolveCounselorId = (r: PreviewRow): number | null => {
    const a = (r.assigned_counselor || '').trim().toLowerCase()
    if (a) {
      const m = counselors.find(c => (c.full_name || '').toLowerCase() === a || (c.full_name || '').toLowerCase().includes(a))
      if (m) return m.id
    }
    return defCounselorId
  }

  const rowValid = (r: PreviewRow) =>
    !!(r.student_full_name || '').trim() && EMAIL_RE.test((r.student_email || '').trim())

  const validRows = rows.filter(rowValid)
  const capacityFits =
    !preview?.capacity.tenant_limit ||
    preview.capacity.tenant_active + validRows.length <= (preview.capacity.tenant_limit || Infinity)
  const overBy = preview?.capacity.tenant_limit
    ? Math.max(0, preview.capacity.tenant_active + validRows.length - preview.capacity.tenant_limit)
    : 0

  // ── Step 3: commit one family at a time ────────────────────────────────────
  const commit = async (only?: number[]) => {
    setCommitting(true); setDone(false)
    const token = await getToken()
    const targets = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) => rowValid(r) && (!only || only.includes(i)))

    for (const { r, i } of targets) {
      setProgress(p => ({ ...p, [i]: { status: 'working' } }))
      try {
        const counselor_id = resolveCounselorId(r)
        if (!counselor_id) throw new Error('No counselor selected')
        const parents = [
          { full_name: (r.parent1_name || '').trim(), email: (r.parent1_email || '').trim() },
          { full_name: (r.parent2_name || '').trim(), email: (r.parent2_email || '').trim() },
        ].filter(p => p.full_name && EMAIL_RE.test(p.email))

        const engagement_type = r.engagement_type || defEngagement || undefined
        const coaching_package_name = r.coaching_package_name || defPackage || undefined
        const start_date = r.start_date || defStart || undefined
        const expected_end_date = r.expected_end_date || defEnd || undefined
        const graduation_year = r.graduation_year ?? undefined

        const essay: Record<string, boolean> = {}
        for (const f of ESSAY_FLAGS) {
          if (!hasModule(f.module)) continue
          const rv = r[f.field as EssayFlagKey]
          essay[f.field] = typeof rv === 'boolean' ? rv : defEssay[f.field as EssayFlagKey]
        }
        const editate =
          hasModule('editate') && (typeof r.editate_enabled === 'boolean' ? r.editate_enabled : defEditate)

        const body: Record<string, unknown> = {
          counselor_id,
          student: { full_name: (r.student_full_name || '').trim(), email: (r.student_email || '').trim() },
          parents,
          ...(engagement_type ? { engagement_type } : {}),
          ...(coaching_package_name ? { coaching_package_name } : {}),
          ...(start_date ? { start_date } : {}),
          ...(expected_end_date ? { expected_end_date } : {}),
          ...(graduation_year ? { graduation_year } : {}),
          ...(editate ? { editate_enabled: true } : {}),
          ...essay,
        }

        const res = await fetch(API + '/tenant-admin/families', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          const detail = d.detail
          if (detail?.code === 'PRACTICE_AT_CAPACITY') {
            setProgress(p => ({ ...p, [i]: { status: 'error', message: 'Practice at capacity — stopped here' } }))
            break // stop the batch; remaining rows stay pending
          }
          const msg = typeof detail === 'string' ? detail : detail?.message || 'Error ' + res.status
          throw new Error(msg)
        }
        const data = await res.json()
        const st: RowStatus = data?.student?.status === 'created' ? 'created' : 'linked'

        // Writing section enrollment (best-effort, mirrors single Add Family)
        const studentId = data?.student?.id
        const toEnroll = WRITING_SECTIONS.filter(s => hasModule(s.module) && defWriting[s.key])
        if (studentId && toEnroll.length) {
          await Promise.all(
            toEnroll.map(s =>
              fetch(API + '/writing/enroll', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: studentId, section_key: s.key }),
              }).catch(() => {})
            )
          )
        }
        setProgress(p => ({ ...p, [i]: { status: st } }))
      } catch (e) {
        setProgress(p => ({ ...p, [i]: { status: 'error', message: e instanceof Error ? e.message : 'Error' } }))
      }
    }
    setCommitting(false); setDone(true)
    onSuccess()
  }

  const failedIdx = Object.entries(progress).filter(([, v]) => v.status === 'error').map(([k]) => Number(k))
  const counts = Object.values(progress).reduce(
    (a, v) => { a[v.status] = (a[v.status] || 0) + 1; return a },
    {} as Record<string, number>
  )

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-slate-800">Import families from CSV</h2>
          <button onClick={close} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-4 overflow-y-auto">
          {error && <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Upload a CSV in any format. Soar reads the columns, maps them to the right fields, and lets you review
                everything before anything is created.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white hover:file:bg-indigo-700"
              />
              {file && <p className="text-xs text-slate-500">Selected: {file.name}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={close} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
                <button
                  onClick={analyze}
                  disabled={!file || analyzing}
                  className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {analyzing ? 'Analyzing…' : 'Analyze CSV'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Column mapping ── */}
          {step === 'map' && preview && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Here is how Soar read your columns. Review, then continue.</p>
              <div className="rounded-lg border divide-y">
                {preview.column_mapping.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{m.source || '(unnamed)'}</span>
                    <span className="text-slate-400">→</span>
                    <span className={m.field === 'ignored' ? 'text-slate-400 italic' : 'text-indigo-700'}>
                      {FIELD_LABELS[m.field] || m.field}
                    </span>
                  </div>
                ))}
              </div>
              {preview.truncated && (
                <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
                  Only the first {preview.max_rows} rows were read. Split larger files and import them in batches.
                </div>
              )}
              <CapacityBanner cap={preview.capacity} valid={validRows.length} fits={capacityFits} overBy={overBy} />
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep('upload')} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">← Back</button>
                <button onClick={() => setStep('review')} className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
                  Continue to review →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review + defaults + commit ── */}
          {step === 'review' && preview && (
            <div className="space-y-4">
              <CapacityBanner cap={preview.capacity} valid={validRows.length} fits={capacityFits} overBy={overBy} />

              {/* Shared defaults */}
              <details className="rounded-lg border bg-slate-50 px-4 py-3" open>
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  Shared defaults — applied to any row the CSV didn&apos;t specify
                </summary>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <label className="flex flex-col gap-1">
                    <span className="text-slate-600">Assign to counselor</span>
                    <select value={defCounselorId ?? ''} onChange={e => setDefCounselorId(Number(e.target.value))} className="border rounded-md px-2 py-1.5">
                      {counselors.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-slate-600">Engagement type</span>
                    <select value={defEngagement} onChange={e => setDefEngagement(e.target.value)} className="border rounded-md px-2 py-1.5">
                      {ENGAGEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-slate-600">Coaching package</span>
                    <input value={defPackage} onChange={e => setDefPackage(e.target.value)} className="border rounded-md px-2 py-1.5" placeholder="e.g. Diamond" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-slate-600">Start date</span>
                    <input type="date" value={defStart} onChange={e => setDefStart(e.target.value)} className="border rounded-md px-2 py-1.5" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-slate-600">Expected end date</span>
                    <input type="date" value={defEnd} onChange={e => setDefEnd(e.target.value)} className="border rounded-md px-2 py-1.5" />
                  </label>
                  {(ESSAY_FLAGS.some(f => hasModule(f.module)) || hasModule('editate')) && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 mt-1 mb-1">ESSAY TOOLS</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {ESSAY_FLAGS.filter(f => hasModule(f.module)).map(f => (
                          <label key={f.field} className="flex items-center gap-1.5">
                            <input type="checkbox" checked={defEssay[f.field as EssayFlagKey]}
                              onChange={e => setDefEssay(s => ({ ...s, [f.field]: e.target.checked }))} />
                            <span>{f.label}</span>
                          </label>
                        ))}
                        {hasModule('editate') && (
                          <label className="flex items-center gap-1.5">
                            <input type="checkbox" checked={defEditate} onChange={e => setDefEditate(e.target.checked)} />
                            <span>Enable Editate</span>
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                  {WRITING_SECTIONS.some(s => hasModule(s.module)) && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 mt-1 mb-1">WRITING COACHING (auto-enroll)</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {WRITING_SECTIONS.filter(s => hasModule(s.module)).map(s => (
                          <label key={s.key} className="flex items-center gap-1.5">
                            <input type="checkbox" checked={!!defWriting[s.key]}
                              onChange={e => setDefWriting(w => ({ ...w, [s.key]: e.target.checked }))} />
                            <span>{s.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>

              {/* Review table */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-2 py-2 text-left">#</th>
                      <th className="px-2 py-2 text-left">Student</th>
                      <th className="px-2 py-2 text-left">Parent email(s)</th>
                      <th className="px-2 py-2 text-left">Grad</th>
                      <th className="px-2 py-2 text-left">Engagement</th>
                      <th className="px-2 py-2 text-left">Package</th>
                      <th className="px-2 py-2 text-left">Counselor</th>
                      <th className="px-2 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r, i) => {
                      const pr = progress[i]
                      const invalid = !rowValid(r)
                      const cName = counselors.find(c => c.id === resolveCounselorId(r))?.full_name || '—'
                      return (
                        <tr key={i} className={invalid ? 'bg-red-50/50' : ''}>
                          <td className="px-2 py-1.5 text-slate-400">{i + 1}</td>
                          <td className="px-2 py-1.5">
                            <input value={r.student_full_name || ''} onChange={e => setRow(i, { student_full_name: e.target.value })}
                              placeholder="Name" className="w-32 border rounded px-1.5 py-1 mb-1 block" />
                            <input value={r.student_email || ''} onChange={e => setRow(i, { student_email: e.target.value })}
                              placeholder="email" className={'w-40 border rounded px-1.5 py-1 block ' + (EMAIL_RE.test((r.student_email || '').trim()) ? '' : 'border-red-300')} />
                            {r._issues && r._issues.length > 0 && (
                              <div className="text-[11px] text-red-600 mt-0.5">{r._issues.join('; ')}</div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 align-top text-slate-600">
                            {[r.parent1_email, r.parent2_email].filter(Boolean).join(', ') || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <input type="number" value={r.graduation_year ?? ''}
                              onChange={e => setRow(i, { graduation_year: e.target.value ? parseInt(e.target.value, 10) : null })}
                              className="w-16 border rounded px-1 py-1" placeholder="—" />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <select value={r.engagement_type || ''}
                              onChange={e => setRow(i, { engagement_type: e.target.value || null })}
                              className="border rounded px-1 py-1 max-w-[9rem]">
                              <option value="">{defEngagement ? '(default)' : '—'}</option>
                              {ENGAGEMENT_TYPES.filter(t => t.value).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <input value={r.coaching_package_name || ''}
                              onChange={e => setRow(i, { coaching_package_name: e.target.value || null })}
                              className="w-28 border rounded px-1.5 py-1" placeholder={defPackage || '—'} />
                          </td>
                          <td className="px-2 py-1.5 align-top text-slate-600">{cName}</td>
                          <td className="px-2 py-1.5 align-top">
                            {invalid ? <Badge tone="red">needs email</Badge>
                              : pr?.status === 'working' ? <Badge tone="blue">working…</Badge>
                              : pr?.status === 'created' ? <Badge tone="green">✓ created</Badge>
                              : pr?.status === 'linked' ? <Badge tone="green">↻ linked</Badge>
                              : pr?.status === 'error' ? <Badge tone="red" title={pr.message}>✗ {pr.message?.slice(0, 30)}</Badge>
                              : <Badge tone="slate">ready</Badge>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Reminder */}
              {!done && (
                <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2">
                  Please review every row carefully before you continue — check names, emails, graduation years, and
                  engagement types. Creating families sends invite emails immediately and can&apos;t be undone.
                </div>
              )}

              {/* Commit controls */}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setStep('map')} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800" disabled={committing}>← Back</button>
                <div className="flex items-center gap-3">
                  {done && (
                    <span className="text-sm text-slate-600">
                      {counts.created || 0} created · {counts.linked || 0} linked · {counts.error || 0} errors
                    </span>
                  )}
                  {done && failedIdx.length > 0 && (
                    <button onClick={() => commit(failedIdx)} disabled={committing}
                      className="px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-50">
                      Retry {failedIdx.length} failed
                    </button>
                  )}
                  {!done && (
                    <button
                      onClick={() => commit()}
                      disabled={committing || validRows.length === 0 || !capacityFits}
                      className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {committing ? 'Creating…' : `Create ${validRows.length} famil${validRows.length === 1 ? 'y' : 'ies'}`}
                    </button>
                  )}
                  {done && <button onClick={close} className="px-4 py-2 text-sm rounded-md bg-slate-800 text-white hover:bg-slate-900">Done</button>}
                </div>
              </div>
              {!capacityFits && (
                <p className="text-xs text-amber-700 text-right">Increase your plan capacity before importing (see the banner above).</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Badge({ tone, children, title }: { tone: 'red' | 'green' | 'blue' | 'slate'; children: React.ReactNode; title?: string }) {
  const cls = {
    red: 'bg-red-100 text-red-700',
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    slate: 'bg-slate-100 text-slate-600',
  }[tone]
  return <span title={title} className={'inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ' + cls}>{children}</span>
}

function CapacityBanner({ cap, valid, fits, overBy }: { cap: Capacity; valid: number; fits: boolean; overBy: number }) {
  if (cap.tenant_limit == null) {
    return <div className="rounded-md bg-slate-50 border text-slate-600 text-sm px-3 py-2">Importing {valid} student{valid === 1 ? '' : 's'} · your plan has no student cap.</div>
  }
  if (fits) {
    return (
      <div className="rounded-md bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2">
        Importing {valid} student{valid === 1 ? '' : 's'} — your plan covers {cap.tenant_limit} ({cap.tenant_active}{' '}active now). You&apos;re within capacity.
      </div>
    )
  }
  return (
    <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm px-3 py-2">
      This import adds {valid} student{valid === 1 ? '' : 's'} — your plan covers {cap.tenant_limit} and {cap.tenant_active} are already active.
      Add <strong>{overBy}</strong> more seat{overBy === 1 ? '' : 's'} to continue.{' '}
      {cap.path === 'billing'
        ? <Link href="/settings/billing" className="underline font-semibold">Manage plan →</Link>
        : <Link href="/upgrade" className="underline font-semibold">Upgrade →</Link>}
    </div>
  )
}
