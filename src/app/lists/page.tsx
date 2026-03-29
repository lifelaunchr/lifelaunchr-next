'use client'

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollegeEntry {
  id: number
  college_name: string
  status: string
  ipeds_id?: number | null
  likelihood?: string | null
  likelihood_explanation?: string | null
  likelihood_override_note?: string | null
  likelihood_set_by?: string | null
  visited?: boolean
  visit_date?: string | null
  did_npc?: boolean
  cost_estimate?: number | null
  counselor_cost_estimate?: number | null
  deadline_date?: string | null
  deadline_type?: string | null
  primary_major?: string | null
  alternate_majors?: string[] | null
  special_programs?: string[] | null
  academic_notes?: string | null
  cultural_notes?: string | null
  admission_notes?: string | null
  other_interesting_facts?: string | null
  relevant_merit_scholarships?: string | null
  coach_notes?: string | null
  parent_notes?: string | null
  soar_research_summary?: string | null
  soar_summary_generated_at?: string | null
  student_note?: string | null
  counselor_note?: string | null
  programs_of_interest?: string | null
  display_order?: number
  created_at?: string
  // Test score / application policy fields
  program_test_required?: boolean
  program_test_required_note?: string | null
  score_submission_policy?: string | null
  srar_required?: string | null
  score_self_report?: string | null
}

interface CollegeSearchResult {
  name: string
  city?: string
  state_code?: string
  website?: string
  id?: number
  undergrad_enrollment?: number
}

interface ScholarshipEntry {
  id: number
  scholarship_name: string
  scholarship_id?: string | null
  in_db?: boolean
  status: string
  award_low?: number | null
  award_high?: number | null
  deadline_month?: number | null
  deadline_day?: number | null
  deadline_date?: string | null
  custom_description?: string | null
  custom_amount_low?: number | null
  custom_amount_high?: number | null
  custom_deadline?: string | null
  custom_url?: string | null
  program_url?: string | null
  application_url?: string | null
  award_amount?: number | null
  notes?: string | null
  added_by_name?: string | null
  created_at?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LIKELIHOOD_COLORS: Record<string, string> = {
  likely:    '#16a34a',
  target:    '#2563eb',
  reach:     '#d97706',
  far_reach: '#ea580c',
  unlikely:  '#dc2626',
  unknown:   '#9ca3af',
}

const LIKELIHOOD_LABELS: Record<string, string> = {
  likely:    'Likely',
  target:    'Target',
  reach:     'Reach',
  far_reach: 'Far Reach',
  unlikely:  'Unlikely',
  unknown:   'Unknown',
}

const STATUS_COLORS: Record<string, string> = {
  researching: '#7c3aed',
  applying:    '#2563eb',
  applied:     '#0891b2',
  accepted:    '#16a34a',
  denied:      '#6b7280',
  waitlisted:  '#d97706',
  deferred:    '#ea580c',
  withdrawn:   '#9ca3af',
}

const STATUS_LABELS: Record<string, string> = {
  researching: 'Researching',
  applying:    'Applying',
  applied:     'Applied',
  accepted:    'Accepted',
  denied:      'Denied',
  waitlisted:  'Waitlisted',
  deferred:    'Deferred',
  withdrawn:   'Withdrawn',
}

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  rd:       'Regular Decision',
  ea:       'Early Action',
  ed1:      'Early Decision I',
  ed2:      'Early Decision II',
  priority: 'Priority',
  custom:   'Custom',
}

const SCHOLARSHIP_STATUS_COLORS: Record<string, string> = {
  researching: '#7c3aed',
  applying:    '#2563eb',
  submitted:   '#0891b2',
  awarded:     '#16a34a',
  not_awarded: '#6b7280',
}

const SCHOLARSHIP_STATUS_LABELS: Record<string, string> = {
  researching: 'Researching',
  applying:    'Applying',
  submitted:   'Submitted',
  awarded:     'Awarded',
  not_awarded: 'Not Awarded',
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function LikelihoodBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null
  const color = LIKELIHOOD_COLORS[tier] || '#6b7280'
  const label = LIKELIHOOD_LABELS[tier] || tier
  return (
    <span style={{
      background: color + '18',
      color,
      border: `1px solid ${color}55`,
      borderRadius: 4,
      padding: '2px 7px',
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || '#6b7280'
  const label = STATUS_LABELS[status] || status
  return (
    <span style={{
      background: color + '18',
      color,
      border: `1px solid ${color}55`,
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: '0.72rem',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function formatDeadline(entry: CollegeEntry): string {
  if (!entry.deadline_date) return ''
  const d = new Date(entry.deadline_date + 'T00:00:00')
  const mon = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  const year = d.getFullYear()
  const type = entry.deadline_type ? ` (${DEADLINE_TYPE_LABELS[entry.deadline_type] || entry.deadline_type})` : ''
  return `${mon} ${day}, ${year}${type}`
}

function ScholarshipStatusBadge({ status }: { status: string }) {
  const color = SCHOLARSHIP_STATUS_COLORS[status] || '#6b7280'
  const label = SCHOLARSHIP_STATUS_LABELS[status] || status
  return (
    <span style={{
      background: color + '18',
      color,
      border: `1px solid ${color}55`,
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: '0.72rem',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function formatScholarshipAward(entry: ScholarshipEntry): string {
  const lo = entry.award_amount ?? entry.award_low ?? entry.custom_amount_low
  const hi = entry.award_high ?? entry.custom_amount_high
  if (entry.award_amount) return `$${Number(entry.award_amount).toLocaleString()} awarded`
  if (lo && hi) return `$${Number(lo).toLocaleString()}–$${Number(hi).toLocaleString()}`
  if (lo) return `$${Number(lo).toLocaleString()}+`
  if (hi) return `Up to $${Number(hi).toLocaleString()}`
  return ''
}

function formatScholarshipDeadline(entry: ScholarshipEntry): string {
  const dateStr = entry.deadline_date || entry.custom_deadline
  if (dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    const mon = d.toLocaleString('en-US', { month: 'short' })
    return `${mon} ${d.getDate()}, ${d.getFullYear()}`
  }
  if (entry.deadline_month && entry.deadline_day) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${months[entry.deadline_month - 1]} ${entry.deadline_day}`
  }
  return ''
}

// ─── Add Scholarship Modal ─────────────────────────────────────────────────────

interface AddScholarshipModalProps {
  onClose: () => void
  onAdd: (name: string) => Promise<void>
}

function AddScholarshipModal({ onClose, onAdd }: AddScholarshipModalProps) {
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!name.trim()) return
    setAdding(true)
    await onAdd(name.trim())
    setAdding(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: '28px 28px 24px', width: 440,
        maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0c1b33', margin: 0 }}>Add Scholarship</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#9ca3af' }}>×</button>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 14 }}>
          Enter the scholarship name exactly as you want it to appear. You can add details after.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Scholarship name…"
          style={{
            width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 14px',
            fontSize: '0.9rem', outline: 'none', marginBottom: 16, boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px', fontSize: '0.875rem', cursor: 'pointer', background: '#fff', color: '#374151' }}>
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={adding || !name.trim()}
            style={{ flex: 1, background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', opacity: adding ? 0.7 : 1 }}
          >
            {adding ? 'Adding…' : 'Add Scholarship'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Scholarship Edit Drawer ────────────────────────────────────────────────────

interface ScholarshipEditDrawerProps {
  entry: ScholarshipEntry
  canWrite: boolean
  onClose: () => void
  onSave: (entryId: number, updates: Partial<ScholarshipEntry>) => Promise<void>
  onDelete: (entryId: number) => void
}

function ScholarshipEditDrawer({ entry, canWrite, onClose, onSave, onDelete }: ScholarshipEditDrawerProps) {
  const [form, setForm] = useState<Partial<ScholarshipEntry>>({ ...entry })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (field: keyof ScholarshipEntry, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    await onSave(entry.id, form)
    setSaving(false)
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 7, padding: '7px 11px',
    fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', background: '#fafafa',
  }
  const labelStyle: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }
  const fieldStyle: React.CSSProperties = { marginBottom: 14 }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500, display: 'flex', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.25)',
    }} onClick={onClose}>
      <div style={{
        width: 420, maxWidth: '100vw', background: '#fff', height: '100%', overflowY: 'auto',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
        padding: '24px 24px 32px',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33', margin: '0 0 4px' }}>
              {entry.scholarship_name}
            </h2>
            <ScholarshipStatusBadge status={entry.status} />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: '#9ca3af', flexShrink: 0 }}>×</button>
        </div>

        {/* Status */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Status</label>
          <select
            value={form.status ?? entry.status}
            onChange={(e) => set('status', e.target.value)}
            disabled={!canWrite}
            style={inputStyle}
          >
            {Object.entries(SCHOLARSHIP_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Award amount (actual) */}
        {(entry.status === 'awarded' || form.status === 'awarded') && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Award Amount (actual $)</label>
            <input
              type="number"
              value={form.award_amount ?? ''}
              onChange={(e) => set('award_amount', e.target.value ? Number(e.target.value) : null)}
              disabled={!canWrite}
              placeholder="e.g. 5000"
              style={inputStyle}
            />
          </div>
        )}

        {/* Program URL */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Program / Info URL</label>
          <input
            type="url"
            value={form.program_url ?? ''}
            onChange={(e) => set('program_url', e.target.value)}
            disabled={!canWrite}
            placeholder="https://…"
            style={inputStyle}
          />
        </div>

        {/* Application URL */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Application URL</label>
          <input
            type="url"
            value={form.application_url ?? ''}
            onChange={(e) => set('application_url', e.target.value)}
            disabled={!canWrite}
            placeholder="https://…"
            style={inputStyle}
          />
        </div>

        {/* Custom deadline */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Deadline (override)</label>
          <input
            type="date"
            value={form.custom_deadline ?? ''}
            onChange={(e) => set('custom_deadline', e.target.value || null)}
            disabled={!canWrite}
            style={inputStyle}
          />
        </div>

        {/* Notes */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            disabled={!canWrite}
            rows={4}
            placeholder="Your notes about this scholarship…"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Actions */}
        {canWrite && (
          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {confirmDelete ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px', fontSize: '0.85rem', cursor: 'pointer', background: '#fff' }}>
                  Cancel
                </button>
                <button onClick={() => { onDelete(entry.id); onClose() }} style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  Confirm Delete
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px', fontSize: '0.85rem', color: '#dc2626', cursor: 'pointer' }}>
                Remove from List
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Scholarship Spreadsheet View ──────────────────────────────────────────────

interface ScholarshipSpreadsheetViewProps {
  entries: ScholarshipEntry[]
  canWrite: boolean
  onEdit: (entry: ScholarshipEntry) => void
  onStatusChange: (id: number, status: string) => void
}

function ScholarshipSpreadsheetView({ entries, canWrite, onEdit, onStatusChange }: ScholarshipSpreadsheetViewProps) {
  if (entries.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '40px 24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
        No scholarships yet. Click &quot;+ Add Scholarship&quot; or ask Soar to search for scholarships.
      </div>
    )
  }
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
            {['Scholarship', 'Award', 'Deadline', 'Status', ''].map((h, i) => (
              <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#fafafa')}
              onMouseOut={(e) => (e.currentTarget.style.background = '')}
              onClick={() => onEdit(entry)}
            >
              <td style={{ padding: '10px 14px' }}>
                <p style={{ margin: 0, fontWeight: 600, color: '#1f2937', fontSize: '0.875rem' }}>{entry.scholarship_name}</p>
                {entry.program_url && (
                  <a href={entry.program_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: '0.75rem', color: '#6366f1' }}>
                    Program info ↗
                  </a>
                )}
              </td>
              <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#374151', whiteSpace: 'nowrap' }}>
                {formatScholarshipAward(entry) || <span style={{ color: '#d1d5db' }}>—</span>}
              </td>
              <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#374151', whiteSpace: 'nowrap' }}>
                {formatScholarshipDeadline(entry) || <span style={{ color: '#d1d5db' }}>—</span>}
              </td>
              <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                {canWrite ? (
                  <select
                    value={entry.status}
                    onChange={(e) => onStatusChange(entry.id, e.target.value)}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer', background: '#fff' }}
                  >
                    {Object.entries(SCHOLARSHIP_STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                ) : (
                  <ScholarshipStatusBadge status={entry.status} />
                )}
              </td>
              <td style={{ padding: '10px 14px' }}>
                <button onClick={(e) => { e.stopPropagation(); onEdit(entry) }} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', color: '#6b7280', cursor: 'pointer' }}>
                  Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Scholarship Card View ─────────────────────────────────────────────────────

interface ScholarshipCardViewProps {
  entries: ScholarshipEntry[]
  canWrite: boolean
  onEdit: (entry: ScholarshipEntry) => void
  onStatusChange: (id: number, status: string) => void
}

function ScholarshipCardView({ entries, canWrite, onEdit, onStatusChange }: ScholarshipCardViewProps) {
  // Group by status
  const columns = [
    { key: 'researching', label: 'Researching' },
    { key: 'applying',    label: 'Applying' },
    { key: 'submitted',   label: 'Submitted' },
    { key: 'awarded',     label: 'Awarded' },
    { key: 'not_awarded', label: 'Not Awarded' },
  ]
  const byStatus: Record<string, ScholarshipEntry[]> = {}
  for (const c of columns) byStatus[c.key] = []
  for (const e of entries) {
    if (byStatus[e.status]) byStatus[e.status].push(e)
    else byStatus['researching'].push(e)
  }

  if (entries.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '40px 24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
        No scholarships yet. Click &quot;+ Add Scholarship&quot; or ask Soar to search for scholarships.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
      {columns.map(({ key, label }) => (
        <div key={key} style={{ minWidth: 240, flex: '0 0 240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            <span style={{ background: '#f3f4f6', borderRadius: 99, padding: '1px 8px', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>{byStatus[key].length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {byStatus[key].map((entry) => (
              <div
                key={entry.id}
                onClick={() => onEdit(entry)}
                style={{
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                  padding: '14px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
                onMouseOut={(e) => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}
              >
                <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#0c1b33', fontSize: '0.875rem', lineHeight: 1.3 }}>{entry.scholarship_name}</p>
                {formatScholarshipAward(entry) && (
                  <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>{formatScholarshipAward(entry)}</p>
                )}
                {formatScholarshipDeadline(entry) && (
                  <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: '#6b7280' }}>Due: {formatScholarshipDeadline(entry)}</p>
                )}
                {canWrite && (
                  <select
                    value={entry.status}
                    onChange={(e) => { e.stopPropagation(); onStatusChange(entry.id, e.target.value) }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 6px', fontSize: '0.78rem', width: '100%', cursor: 'pointer', background: '#fafafa' }}
                  >
                    {Object.entries(SCHOLARSHIP_STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Add College Modal ────────────────────────────────────────────────────────

interface AddCollegeModalProps {
  onClose: () => void
  onAdd: (name: string, ipedsId?: number) => Promise<void>
  apiUrl: string
  getToken: () => Promise<string | null>
}

function AddCollegeModal({ onClose, onAdd, apiUrl, getToken }: AddCollegeModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CollegeSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const [adding, setAdding] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`${apiUrl}/college-lookup?name=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [apiUrl])

  const handleQueryChange = (v: string) => {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 300)
  }

  const handleSelect = async (r: CollegeSearchResult) => {
    setAdding(true)
    await onAdd(r.name, r.id)
    setAdding(false)
  }

  const handleManualAdd = async () => {
    if (!manualName.trim()) return
    setAdding(true)
    await onAdd(manualName.trim())
    setAdding(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: '28px 28px 24px', width: 480,
        maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0c1b33', margin: 0 }}>Add College</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#9ca3af' }}>×</button>
        </div>

        {!manualMode ? (
          <>
            <input
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search colleges…"
              style={{
                border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 14px',
                fontSize: '0.9rem', outline: 'none', marginBottom: 12,
              }}
            />
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {searching && <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', padding: 12 }}>Searching…</p>}
              {!searching && results.length === 0 && query.length >= 2 && (
                <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', padding: 12 }}>No matches found.</p>
              )}
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(r)}
                  disabled={adding}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '10px 12px', borderRadius: 8,
                    borderBottom: '1px solid #f3f4f6',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <p style={{ margin: 0, fontWeight: 600, color: '#1f2937', fontSize: '0.875rem' }}>{r.name}</p>
                  {(r.city || r.state_code) && (
                    <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.78rem' }}>
                      {[r.city, r.state_code].filter(Boolean).join(', ')}
                    </p>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setManualMode(true)}
              style={{ marginTop: 14, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline' }}
            >
              Not in list? Add manually (international schools)
            </button>
          </>
        ) : (
          <>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 12 }}>Enter the college name exactly as you want it to appear.</p>
            <input
              autoFocus
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
              placeholder="College name…"
              style={{
                border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 14px',
                fontSize: '0.9rem', outline: 'none', marginBottom: 14,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setManualMode(false)}
                style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px', fontSize: '0.875rem', cursor: 'pointer', background: '#fff', color: '#374151' }}
              >Back to Search</button>
              <button
                onClick={handleManualAdd}
                disabled={adding || !manualName.trim()}
                style={{ flex: 1, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', opacity: adding ? 0.7 : 1 }}
              >Add College</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

interface EditDrawerProps {
  entry: CollegeEntry
  accountType: string
  viewerIsStudent: boolean
  canWrite: boolean
  onClose: () => void
  onSave: (entryId: number, updates: Partial<CollegeEntry>) => Promise<void>
  apiUrl: string
  getToken: () => Promise<string | null>
}

function EditDrawer({ entry, accountType, viewerIsStudent, canWrite, onClose, onSave, apiUrl, getToken }: EditDrawerProps) {
  const [form, setForm] = useState<Partial<CollegeEntry>>({ ...entry })
  const [saving, setSaving] = useState(false)
  const [deadlines, setDeadlines] = useState<Array<{ label: string; type: string; month: number; day: number }>>([])
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [summaryText, setSummaryText] = useState(entry.soar_research_summary || '')
  const [activeSection, setActiveSection] = useState<string>('overview')
  const [recalculating, setRecalculating] = useState(false)
  const [recalcMessage, setRecalcMessage] = useState<string | null>(null)
  const [showLikelihoodModal, setShowLikelihoodModal] = useState(false)

  const isCounselor = accountType === 'counselor' || accountType === 'admin'
  const isParent = accountType === 'parent'

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken()
        const res = await fetch(`${apiUrl}/lists/colleges/${entry.id}/deadlines`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setDeadlines(data.deadlines || [])
        }
      } catch { /* ignore */ }
    }
    load()
  }, [entry.id, apiUrl, getToken])

  const set = (field: keyof CollegeEntry, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    await onSave(entry.id, form)
    setSaving(false)
    onClose()
  }

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true)
    setSummaryText('')
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/lists/colleges/${entry.id}/generate-summary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6))
              if (payload.text) setSummaryText((prev) => prev + payload.text)
            } catch { /* ignore */ }
          }
        }
      }
    } catch { /* ignore */ } finally {
      setGeneratingSummary(false)
    }
  }

  const handleRecalculate = async () => {
    setRecalculating(true)
    setRecalcMessage(null)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/lists/colleges/${entry.id}/recalculate-likelihood`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setRecalcMessage(`Error: ${err.detail || res.statusText}`)
        return
      }
      const updated = await res.json()
      setForm((prev) => ({
        ...prev,
        likelihood: updated.likelihood,
        likelihood_explanation: updated.likelihood_explanation,
        likelihood_set_by: updated.likelihood_set_by,
        likelihood_override_note: updated.likelihood_override_note,
      }))
      setRecalcMessage('Updated')
      setTimeout(() => setRecalcMessage(null), 3000)
    } catch (e) {
      setRecalcMessage('Error recalculating')
    } finally {
      setRecalculating(false)
    }
  }

  const deadlineOptions = [
    { value: '', label: 'Select type…' },
    ...deadlines.map((d) => ({
      value: d.type,
      label: `${d.label} (${d.month}/${d.day})`,
    })),
    { value: 'priority', label: 'Priority' },
    { value: 'custom', label: 'Custom' },
  ]

  const sections = [
    { key: 'overview', label: 'Overview' },
    { key: 'application', label: 'Application' },
    { key: 'research', label: 'Research Notes' },
    { key: 'financial', label: 'Financial' },
    { key: 'people', label: 'People Notes' },
    { key: 'summary', label: 'Soar Summary' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 7, padding: '7px 11px',
    fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', background: '#fafafa',
  }
  const readonlyStyle: React.CSSProperties = { ...inputStyle, background: '#f3f4f6', color: '#6b7280' }
  const labelStyle: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }
  const fieldStyle: React.CSSProperties = { marginBottom: 14 }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      display: 'flex', justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      {/* Drawer */}
      <div style={{
        width: 520, maxWidth: '95vw', background: '#fff', height: '100vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#9ca3af', fontWeight: 500, marginBottom: 2 }}>EDITING</p>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0c1b33' }}>{entry.college_name}</h2>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <LikelihoodBadge tier={form.likelihood} />
              <StatusBadge status={form.status || entry.status} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: '#9ca3af', padding: '0 4px' }}>×</button>
        </div>

        {/* Section tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #e2e8f0', padding: '0 22px', gap: 0 }}>
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              style={{
                padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap',
                color: activeSection === s.key ? '#4f46e5' : '#6b7280',
                borderBottom: activeSection === s.key ? '2px solid #4f46e5' : '2px solid transparent',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div style={{ flex: 1, padding: '20px 22px', overflowY: 'auto' }}>

          {activeSection === 'overview' && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Status</label>
                {(canWrite && !isParent) ? (
                  <select
                    value={form.status || entry.status}
                    onChange={(e) => set('status', e.target.value)}
                    style={inputStyle}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                ) : (
                  <StatusBadge status={entry.status} />
                )}
              </div>

              <div style={fieldStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <label style={{ ...labelStyle, margin: 0 }}>Likelihood</label>
                  <button
                    onClick={() => setShowLikelihoodModal(true)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                             color: '#6366f1', fontSize: '0.75rem', fontWeight: 500 }}
                  >
                    What does this mean?
                  </button>
                </div>
                {form.likelihood ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <LikelihoodBadge tier={form.likelihood} />
                    {form.likelihood_set_by === 'counselor' && (
                      <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontStyle: 'italic' }}>counselor override</span>
                    )}
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>Not calculated — add student test scores and GPA to your profile to enable.</p>
                )}
                {form.likelihood_explanation && (
                  <p style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: 6, lineHeight: 1.5 }}>
                    {form.likelihood_explanation.split('; ').map((line, i) => (
                      <span key={i} style={{ display: 'block' }}>{line}</span>
                    ))}
                  </p>
                )}
                {canWrite && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={handleRecalculate}
                      disabled={recalculating}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'none', border: '1px solid #e2e8f0', borderRadius: 5,
                        padding: '4px 10px', fontSize: '0.78rem', cursor: recalculating ? 'default' : 'pointer',
                        color: recalculating ? '#9ca3af' : '#4f46e5', fontWeight: 600,
                        opacity: recalculating ? 0.7 : 1,
                      }}
                    >
                      {recalculating ? (
                        <>
                          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
                          Recalculating…
                        </>
                      ) : (
                        <>↻ Recalculate</>
                      )}
                    </button>
                    {recalcMessage && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: recalcMessage.startsWith('Error') ? '#dc2626' : '#16a34a',
                        fontWeight: 500,
                      }}>
                        {recalcMessage}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {isCounselor && (
                <>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Likelihood Override (counselor)</label>
                    <select
                      value={form.likelihood || ''}
                      onChange={(e) => { set('likelihood', e.target.value || null); set('likelihood_set_by', 'counselor') }}
                      style={inputStyle}
                    >
                      <option value="">Auto-calculated</option>
                      {Object.entries(LIKELIHOOD_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Override Note</label>
                    <textarea
                      value={form.likelihood_override_note || ''}
                      onChange={(e) => set('likelihood_override_note', e.target.value)}
                      rows={2}
                      placeholder="Reason for override…"
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>
                </>
              )}

              {/* Campus visit — belongs in overview context */}
              <div style={{ ...fieldStyle, marginTop: 6 }}>
                <label style={labelStyle}>
                  <input
                    type="checkbox"
                    checked={!!form.visited}
                    onChange={(e) => set('visited', e.target.checked)}
                    disabled={!canWrite || isParent}
                    style={{ marginRight: 6 }}
                  />
                  Visited Campus
                </label>
                {form.visited && (
                  <input
                    type="date"
                    value={form.visit_date || ''}
                    onChange={(e) => set('visit_date', e.target.value || null)}
                    disabled={!canWrite || isParent}
                    style={{ ...inputStyle, marginTop: 8 }}
                  />
                )}
              </div>
            </>
          )}

          {activeSection === 'application' && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Application Deadline</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="date"
                    value={form.deadline_date || ''}
                    onChange={(e) => set('deadline_date', e.target.value || null)}
                    disabled={!canWrite || isParent}
                    style={canWrite && !isParent ? inputStyle : readonlyStyle}
                  />
                  <select
                    value={form.deadline_type || ''}
                    onChange={(e) => {
                      const val = e.target.value || null
                      set('deadline_type', val)
                      // Auto-populate date from Peterson's data when a known type is selected
                      if (val) {
                        const match = deadlines.find((d) => d.type === val)
                        if (match) {
                          const now = new Date()
                          // Pick year: if the deadline month/day is still in the future this year use this year,
                          // otherwise use next year (for upcoming application cycle)
                          const thisYear = now.getFullYear()
                          const deadlineThisYear = new Date(thisYear, match.month - 1, match.day)
                          const year = deadlineThisYear > now ? thisYear : thisYear + 1
                          const mm = String(match.month).padStart(2, '0')
                          const dd = String(match.day).padStart(2, '0')
                          set('deadline_date', `${year}-${mm}-${dd}`)
                        }
                      }
                    }}
                    disabled={!canWrite || isParent}
                    style={{ ...inputStyle, width: 160, flexShrink: 0 }}
                  >
                    {deadlineOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Primary Major</label>
                <input
                  value={form.primary_major || ''}
                  onChange={(e) => set('primary_major', e.target.value)}
                  disabled={!canWrite || isParent}
                  placeholder="e.g., Computer Science"
                  style={canWrite && !isParent ? inputStyle : readonlyStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Alternate Majors (comma-separated)</label>
                <input
                  value={(form.alternate_majors || []).join(', ')}
                  onChange={(e) => set('alternate_majors', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  disabled={!canWrite || isParent}
                  placeholder="e.g., Mathematics, Statistics"
                  style={canWrite && !isParent ? inputStyle : readonlyStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Special Programs (comma-separated)</label>
                <input
                  value={(form.special_programs || []).join(', ')}
                  onChange={(e) => set('special_programs', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  disabled={!canWrite || isParent}
                  placeholder="e.g., Honors College, Co-op Program"
                  style={canWrite && !isParent ? inputStyle : readonlyStyle}
                />
              </div>

              {/* ── Test Score Policies ──────────────────────────────────────── */}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 8, paddingTop: 16 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase',
                             letterSpacing: '0.08em', marginBottom: 12 }}>Test Score Policies</p>

                {/* Program/scholarship test override */}
                <div style={fieldStyle}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={form.program_test_required ?? false}
                      onChange={(e) => set('program_test_required', e.target.checked)}
                      disabled={!canWrite || isParent}
                      style={{ marginTop: 3, flexShrink: 0, accentColor: '#4f46e5' }}
                    />
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                        A program or scholarship I&rsquo;m applying to requires test scores
                      </label>
                      <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '3px 0 0' }}>
                        Even if this school is test-optional, check this if your specific program or scholarship requires SAT/ACT scores.
                        This will be factored into your likelihood calculation.
                      </p>
                    </div>
                  </div>
                  {form.program_test_required && (
                    <input
                      value={form.program_test_required_note || ''}
                      onChange={(e) => set('program_test_required_note', e.target.value)}
                      disabled={!canWrite || isParent}
                      placeholder="Which program or scholarship requires scores?"
                      style={{ ...inputStyle, marginTop: 8 }}
                    />
                  )}
                </div>

                {/* Score submission policy */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Score Submission Policy{' '}
                    <a href="https://www.compassprep.com/superscore-and-score-choice/"
                       target="_blank" rel="noopener noreferrer"
                       style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 400 }}>
                      Look this up ↗
                    </a>
                  </label>
                  <select
                    value={form.score_submission_policy || ''}
                    onChange={(e) => set('score_submission_policy', e.target.value || null)}
                    disabled={!canWrite || isParent}
                    style={canWrite && !isParent ? inputStyle : readonlyStyle}
                  >
                    <option value="">Not specified — check college website</option>
                    <option value="superscore">Superscores (takes your best section scores across dates)</option>
                    <option value="single_sitting">Single best sitting (one test date only)</option>
                    <option value="all_scores">All scores required (must submit every test date)</option>
                  </select>
                </div>

                {/* Self-reporting vs. official */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Score Reporting Method{' '}
                    <a href="https://www.compassprep.com/self-reporting-test-scores/"
                       target="_blank" rel="noopener noreferrer"
                       style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 400 }}>
                      Look this up ↗
                    </a>
                  </label>
                  <select
                    value={form.score_self_report || ''}
                    onChange={(e) => set('score_self_report', e.target.value || null)}
                    disabled={!canWrite || isParent}
                    style={canWrite && !isParent ? inputStyle : readonlyStyle}
                  >
                    <option value="">Not specified — check college website</option>
                    <option value="self_reported_ok">Self-reported scores accepted for application</option>
                    <option value="official_at_application">Official scores required at application</option>
                    <option value="official_after_admission">Self-report to apply; official required after admission</option>
                  </select>
                </div>

                {/* SRAR */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>
                    Self-Reported Academic Record (SRAR){' '}
                    <a href="https://srar.selfreportedtranscript.com/Login.aspx"
                       target="_blank" rel="noopener noreferrer"
                       style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 400 }}>
                      SRAR portal ↗
                    </a>
                  </label>
                  <select
                    value={form.srar_required || ''}
                    onChange={(e) => set('srar_required', e.target.value || null)}
                    disabled={!canWrite || isParent}
                    style={canWrite && !isParent ? inputStyle : readonlyStyle}
                  >
                    <option value="">Not specified — check college website</option>
                    <option value="required">Required</option>
                    <option value="sometimes">Required for some applicants</option>
                    <option value="not_required">Not required</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {activeSection === 'research' && (
            <>
              {[
                { field: 'academic_notes', label: 'Academic Notes', placeholder: 'Academic programs, research opportunities, faculty…' },
                { field: 'cultural_notes', label: 'Cultural Notes', placeholder: 'Campus culture, social life, diversity, location feel…' },
                { field: 'admission_notes', label: 'Why I\'m a Good Fit', placeholder: 'How this school fits your goals, strengths, and interests…' },
                { field: 'other_interesting_facts', label: 'Other Interesting Facts', placeholder: 'Anything else noteworthy about this school…' },
                { field: 'relevant_merit_scholarships', label: 'Merit Scholarships', placeholder: 'Scholarships you may qualify for at this school…' },
              ].map(({ field, label, placeholder }) => (
                <div key={field} style={fieldStyle}>
                  <label style={labelStyle}>{label}</label>
                  <textarea
                    value={(form as Record<string, unknown>)[field] as string || ''}
                    onChange={(e) => set(field as keyof CollegeEntry, e.target.value)}
                    disabled={!canWrite || isParent}
                    placeholder={placeholder}
                    rows={3}
                    style={{ ...(canWrite && !isParent ? inputStyle : readonlyStyle), resize: 'vertical' }}
                  />
                </div>
              ))}
            </>
          )}

          {activeSection === 'financial' && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  <input
                    type="checkbox"
                    checked={!!form.did_npc}
                    onChange={(e) => set('did_npc', e.target.checked)}
                    disabled={!canWrite || isParent}
                    style={{ marginRight: 6 }}
                  />
                  Completed Net Price Calculator
                </label>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>My Cost Estimate ($/year)</label>
                <input
                  type="number"
                  value={form.cost_estimate || ''}
                  onChange={(e) => set('cost_estimate', e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!canWrite || isParent}
                  placeholder="e.g., 32000"
                  style={canWrite && !isParent ? inputStyle : readonlyStyle}
                />
              </div>

              {isCounselor && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>Counselor Cost Estimate ($/year)</label>
                  <input
                    type="number"
                    value={form.counselor_cost_estimate || ''}
                    onChange={(e) => set('counselor_cost_estimate', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="e.g., 28000"
                    style={inputStyle}
                  />
                </div>
              )}
            </>
          )}

          {activeSection === 'people' && (
            <>
              {isCounselor && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>Coach Notes (internal — student cannot edit)</label>
                  <textarea
                    value={form.coach_notes || ''}
                    onChange={(e) => set('coach_notes', e.target.value)}
                    rows={4}
                    placeholder="Internal notes for the counseling team…"
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              )}

              {!isCounselor && !!entry.coach_notes && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>Coach Notes</label>
                  <textarea
                    readOnly
                    value={entry.coach_notes}
                    rows={4}
                    style={{ ...readonlyStyle, resize: 'vertical' }}
                  />
                </div>
              )}

              <div style={fieldStyle}>
                <label style={labelStyle}>Parent Notes</label>
                <textarea
                  value={form.parent_notes || ''}
                  onChange={(e) => set('parent_notes', e.target.value)}
                  disabled={!isParent && !isCounselor && !viewerIsStudent}
                  rows={3}
                  placeholder="Parent thoughts or questions about this school…"
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {!isParent && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>My Note</label>
                  <textarea
                    value={form.student_note || ''}
                    onChange={(e) => set('student_note', e.target.value)}
                    disabled={isParent}
                    rows={3}
                    placeholder="Personal notes…"
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              )}
            </>
          )}

          {activeSection === 'summary' && (
            <>
              {(summaryText || entry.soar_research_summary) ? (
                <div>
                  <p style={{ whiteSpace: 'pre-wrap', color: '#374151', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: 16 }}>
                    {summaryText || entry.soar_research_summary}
                  </p>
                  {entry.soar_summary_generated_at && !summaryText && (
                    <p style={{ color: '#9ca3af', fontSize: '0.78rem', marginBottom: 12 }}>
                      Generated {new Date(entry.soar_summary_generated_at).toLocaleDateString()}
                    </p>
                  )}
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    style={{
                      background: '#f3f4f6', border: '1px solid #e2e8f0', borderRadius: 7,
                      padding: '7px 14px', fontSize: '0.82rem', cursor: 'pointer', color: '#374151',
                      opacity: generatingSummary ? 0.7 : 1,
                    }}
                  >
                    {generatingSummary ? 'Regenerating…' : 'Regenerate Summary'}
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 16 }}>
                    Get a personalized research summary for this school based on your profile.
                  </p>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    style={{
                      background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8,
                      padding: '10px 22px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      opacity: generatingSummary ? 0.7 : 1,
                    }}
                  >
                    {generatingSummary ? 'Generating…' : 'Generate Soar Summary'}
                  </button>
                  {generatingSummary && summaryText && (
                    <p style={{ whiteSpace: 'pre-wrap', color: '#374151', fontSize: '0.875rem', lineHeight: 1.65, marginTop: 16, textAlign: 'left' }}>
                      {summaryText}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {(canWrite || isParent) && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 18px', fontSize: '0.875rem', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* ── Likelihood explainer modal ─────────────────────────────────────── */}
      {showLikelihoodModal && (
        <div
          onClick={() => setShowLikelihoodModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999,
                   display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 14, padding: '28px 30px', maxWidth: 560,
                     width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Understanding Your Likelihood
              </h2>
              <button onClick={() => setShowLikelihoodModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.65, marginBottom: 14 }}>
              <strong>Important:</strong> Likelihood is a statistical estimate — it does <em>not</em> account for essays,
              demonstrated interest, personal qualities, hooks (like legacy status, artistic talent, or athletic recruitment),
              or the many other factors that shape admissions decisions. Colleges review each student individually.
            </p>
            <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.65, marginBottom: 18 }}>
              The most important reason we calculate likelihood is to help students build <strong>statistically balanced lists</strong>.
              We use GPA, test scores, academic rigor, extracurricular activities, and athletic accomplishments
              as inputs — the same signals colleges weigh most heavily in initial review.
              Ask your counselor or coach to help you interpret and act on this information.
            </p>

            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>What Each Category Means</h3>
            {[
              { tier: 'likely',    color: '#16a34a', label: 'Likely',
                desc: 'You have a greater than 50% chance of admission based on your academics, rigor, extracurriculars, and athletics.' },
              { tier: 'target',   color: '#2563eb', label: 'Target',
                desc: 'You have a 25–50% chance of admission. A solid application, but not a lock.' },
              { tier: 'reach',    color: '#d97706', label: 'Reach',
                desc: 'You may be competitive, but your chance of admission is below 25%. Strong applications sometimes succeed here.' },
              { tier: 'far_reach',color: '#ea580c', label: 'Far Reach',
                desc: 'You are marginally competitive based on the data. Success requires exceptional other factors — essays, hooks, or unique circumstances.' },
              { tier: 'unlikely', color: '#dc2626', label: 'Unlikely',
                desc: 'You are extremely unlikely to be a competitive applicant based on the data, unless there are significant other factors.' },
              { tier: 'unknown',  color: '#9ca3af', label: 'Unknown',
                desc: 'We don\'t have enough data to calculate — typically because the school is test-required and no test score is on file.' },
            ].map(({ tier, color, label, desc }) => (
              <div key={tier} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <span style={{ background: color, color: '#fff', borderRadius: 6, padding: '2px 10px',
                               fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 2 }}>
                  {label}
                </span>
                <p style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.55, margin: 0 }}>{desc}</p>
              </div>
            ))}

            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 16, lineHeight: 1.5 }}>
              Remember: a "Far Reach" or "Unlikely" rating doesn't mean a student <em>shouldn't</em> apply —
              it means they should apply with eyes open, and balance their list with Likely and Target schools.
              Students with strong essays, compelling stories, or special hooks sometimes exceed statistical expectations.
            </p>

            <button
              onClick={() => setShowLikelihoodModal(false)}
              style={{ marginTop: 20, width: '100%', background: '#4f46e5', color: '#fff', border: 'none',
                       borderRadius: 8, padding: '10px 0', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Spreadsheet view ─────────────────────────────────────────────────────────

interface SpreadsheetViewProps {
  entries: CollegeEntry[]
  canWrite: boolean
  accountType: string
  onEdit: (entry: CollegeEntry) => void
  onDelete: (id: number) => void
  onStatusChange: (id: number, status: string) => void
}

function SpreadsheetView({ entries, canWrite, accountType, onEdit, onDelete, onStatusChange }: SpreadsheetViewProps) {
  const thStyle: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontSize: '0.75rem',
    fontWeight: 700, color: '#6b7280', borderBottom: '2px solid #e2e8f0',
    background: '#f9fafb', whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '11px 12px', fontSize: '0.83rem', color: '#1f2937',
    borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle',
  }

  if (entries.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: '#9ca3af' }}>
        No colleges yet. Click "+ Add College" to build your list.
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>College</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Likelihood</th>
              <th style={thStyle}>Deadline</th>
              <th style={thStyle}>Major</th>
              <th style={thStyle}>Est. Cost</th>
              <th style={thStyle}>Visited</th>
              <th style={{ ...thStyle, width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.id}
                onClick={() => onEdit(e)}
                style={{ cursor: 'pointer' }}
                onMouseOver={(ev) => (ev.currentTarget.style.background = '#f8fafc')}
                onMouseOut={(ev) => (ev.currentTarget.style.background = 'transparent')}
              >
                <td style={tdStyle}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{e.college_name}</p>
                </td>
                <td style={tdStyle} onClick={(ev) => ev.stopPropagation()}>
                  {canWrite && accountType !== 'parent' ? (
                    <select
                      value={e.status}
                      onChange={(ev) => onStatusChange(e.id, ev.target.value)}
                      style={{
                        border: `1.5px solid ${STATUS_COLORS[e.status] || '#e5e7eb'}`,
                        borderRadius: 6, padding: '3px 7px', fontSize: '0.78rem',
                        fontWeight: 600, color: STATUS_COLORS[e.status] || '#374151',
                        background: '#fff', cursor: 'pointer', outline: 'none',
                      }}
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={e.status} />
                  )}
                </td>
                <td style={tdStyle}>
                  <LikelihoodBadge tier={e.likelihood} />
                </td>
                <td style={{ ...tdStyle, fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                  {formatDeadline(e)}
                </td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>
                  {e.primary_major || '—'}
                </td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>
                  {e.counselor_cost_estimate
                    ? `$${e.counselor_cost_estimate.toLocaleString()}`
                    : e.cost_estimate
                    ? `$${e.cost_estimate.toLocaleString()}`
                    : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {e.visited ? (
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                  ) : (
                    <span style={{ color: '#d1d5db' }}>—</span>
                  )}
                </td>
                <td style={tdStyle} onClick={(ev) => ev.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => onEdit(e)}
                      title="Edit"
                      style={{ background: '#f3f4f6', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: '0.78rem', color: '#374151' }}
                    >Edit</button>
                    {canWrite && accountType !== 'parent' && (
                      <button
                        onClick={() => onDelete(e.id)}
                        title="Remove"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '1rem', lineHeight: 1, padding: '2px 4px' }}
                      >×</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Card view ────────────────────────────────────────────────────────────────

interface CardViewProps {
  entries: CollegeEntry[]
  canWrite: boolean
  accountType: string
  onEdit: (entry: CollegeEntry) => void
  onDelete: (id: number) => void
  onDrop: (entryId: number, targetStatus: string) => void
}

function CollegeCard({ entry, onEdit, onDelete, canWrite, accountType, onDragStart }:
  { entry: CollegeEntry; onEdit: () => void; onDelete: () => void; canWrite: boolean; accountType: string; onDragStart: (e: React.DragEvent) => void }) {
  return (
    <div
      draggable={canWrite && accountType !== 'parent'}
      onDragStart={onDragStart}
      onClick={onEdit}
      style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
        padding: '14px 16px', cursor: 'pointer', userSelect: 'none',
        marginBottom: 8,
      }}
      onMouseOver={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
      onMouseOut={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#0c1b33', lineHeight: 1.3 }}>
          {entry.college_name}
        </p>
        {canWrite && accountType !== 'parent' && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '1rem', flexShrink: 0, padding: 0, lineHeight: 1 }}
          >×</button>
        )}
      </div>
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <LikelihoodBadge tier={entry.likelihood} />
      </div>
      {entry.primary_major && (
        <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>{entry.primary_major}</p>
      )}
      {entry.deadline_date && (
        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>{formatDeadline(entry)}</p>
      )}
    </div>
  )
}

function CardView({ entries, canWrite, accountType, onEdit, onDelete, onDrop }: CardViewProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const researching = entries.filter((e) => !e.status || e.status === 'researching')
  const applying    = entries.filter((e) => e.status && e.status !== 'researching')

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    if (draggingId !== null) {
      onDrop(draggingId, targetStatus)
    }
    setDraggingId(null)
    setDragOver(null)
  }

  const colStyle = (side: string): React.CSSProperties => ({
    flex: 1, minHeight: 300,
    background: dragOver === side ? '#f0f4ff' : '#f9fafb',
    border: `2px dashed ${dragOver === side ? '#818cf8' : '#e2e8f0'}`,
    borderRadius: 12, padding: '16px 14px',
    transition: 'background 0.15s, border-color 0.15s',
  })

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Researching column */}
      <div
        style={colStyle('researching')}
        onDragOver={(e) => { e.preventDefault(); setDragOver('researching') }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, 'researching')}
      >
        <p style={{ margin: '0 0 12px', fontSize: '0.8rem', fontWeight: 700, color: '#7c3aed' }}>
          Researching ({researching.length})
        </p>
        {researching.map((e) => (
          <CollegeCard
            key={e.id}
            entry={e}
            onEdit={() => onEdit(e)}
            onDelete={() => onDelete(e.id)}
            canWrite={canWrite}
            accountType={accountType}
            onDragStart={(ev) => handleDragStart(ev, e.id)}
          />
        ))}
        {researching.length === 0 && (
          <p style={{ color: '#c4b5fd', fontSize: '0.82rem', textAlign: 'center', margin: 0 }}>Drag cards here</p>
        )}
      </div>

      {/* Applying column */}
      <div
        style={colStyle('applying')}
        onDragOver={(e) => { e.preventDefault(); setDragOver('applying') }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, 'applying')}
      >
        <p style={{ margin: '0 0 12px', fontSize: '0.8rem', fontWeight: 700, color: '#2563eb' }}>
          Applying ({applying.length})
        </p>
        {applying.map((e) => (
          <CollegeCard
            key={e.id}
            entry={e}
            onEdit={() => onEdit(e)}
            onDelete={() => onDelete(e.id)}
            canWrite={canWrite}
            accountType={accountType}
            onDragStart={(ev) => handleDragStart(ev, e.id)}
          />
        ))}
        {applying.length === 0 && (
          <p style={{ color: '#93c5fd', fontSize: '0.82rem', textAlign: 'center', margin: 0 }}>Drag cards here</p>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ListsContent() {
  const { getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const searchParams = useSearchParams()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const forParam = searchParams.get('for')
  const forStudentId = forParam ? parseInt(forParam, 10) : null
  const isViewingStudent = forStudentId !== null

  const tabParam = searchParams.get('tab')

  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [accountType, setAccountType] = useState<string>('student')
  const [canWrite, setCanWrite] = useState(true)
  const [entries, setEntries] = useState<CollegeEntry[]>([])
  const [scholarships, setScholarships] = useState<ScholarshipEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'colleges' | 'scholarships'>(
    tabParam === 'scholarships' ? 'scholarships' : 'colleges'
  )
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'card'>('spreadsheet')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddScholarshipModal, setShowAddScholarshipModal] = useState(false)
  const [editEntry, setEditEntry] = useState<CollegeEntry | null>(null)
  const [editScholarship, setEditScholarship] = useState<ScholarshipEntry | null>(null)

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
        setAccountType(usage.account_type || 'student')

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

        const listRes = await fetch(`${apiUrl}/lists/${targetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (listRes.ok) {
          const data = await listRes.json()
          setEntries(data.research || [])
          setScholarships(data.scholarships || [])
          if (typeof data.can_write === 'boolean') setCanWrite(data.can_write)
        }
      } catch { setError('Failed to load lists.') } finally { setLoading(false) }
    }
    load()
  }, [getToken, apiUrl, forStudentId, clerkUser])

  const targetId = forStudentId ?? myUserId

  const addCollege = async (name: string, ipedsId?: number) => {
    if (!targetId || !canWrite) return
    const token = await getToken()
    const res = await fetch(`${apiUrl}/lists/${targetId}/colleges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ college_name: name, ipeds_id: ipedsId }),
    })
    if (res.ok) {
      const added = await res.json()
      if (added.id) {
        setEntries((prev) => [{ ...added, status: added.status || 'researching' }, ...prev])
      }
    }
    setShowAddModal(false)
  }

  const updateEntry = async (entryId: number, updates: Partial<CollegeEntry>) => {
    const token = await getToken()
    const res = await fetch(`${apiUrl}/lists/colleges/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const updated = await res.json()
      setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, ...updated } : e))
    }
  }

  const updateStatus = (entryId: number, status: string) =>
    updateEntry(entryId, { status })

  const removeCollege = async (entryId: number) => {
    if (!canWrite) return
    const token = await getToken()
    await fetch(`${apiUrl}/lists/colleges/${entryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
  }

  const addScholarship = async (name: string) => {
    if (!targetId || !canWrite) return
    const token = await getToken()
    const res = await fetch(`${apiUrl}/lists/${targetId}/scholarships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ scholarship_name: name }),
    })
    if (res.ok) {
      const added = await res.json()
      if (added.id) setScholarships((prev) => [added, ...prev])
    }
    setShowAddScholarshipModal(false)
  }

  const updateScholarship = async (entryId: number, updates: Partial<ScholarshipEntry>) => {
    const token = await getToken()
    const res = await fetch(`${apiUrl}/lists/scholarships/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const updated = await res.json()
      setScholarships((prev) => prev.map((e) => e.id === entryId ? { ...e, ...updated } : e))
    }
  }

  const removeScholarship = async (entryId: number) => {
    if (!canWrite) return
    const token = await getToken()
    await fetch(`${apiUrl}/lists/scholarships/${entryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setScholarships((prev) => prev.filter((e) => e.id !== entryId))
  }

  const handleDrop = (entryId: number, targetStatus: string) => {
    const entry = entries.find((e) => e.id === entryId)
    if (!entry) return
    // Map drop column to correct status
    let newStatus = targetStatus
    if (targetStatus === 'applying' && entry.status === 'researching') {
      newStatus = 'applying'
    } else if (targetStatus === 'researching' && entry.status !== 'researching') {
      newStatus = 'researching'
    } else {
      return // no change needed
    }
    updateStatus(entryId, newStatus)
  }

  const viewerIsStudent = accountType === 'student' || (!isViewingStudent && myUserId === targetId)
  const isCounselor = accountType === 'counselor' || accountType === 'admin'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af' }}>
      Loading…
    </div>
  )
  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <p style={{ color: '#6b7280' }}>{error}</p>
      <Link href="/sign-in" style={{ color: '#4f46e5', textDecoration: 'underline' }}>Sign in</Link>
    </div>
  )

  const pageTitle = isViewingStudent
    ? `${studentName ? `${studentName}'s` : 'Student'} ${activeTab === 'scholarships' ? 'Scholarship' : 'College'} Lists`
    : `My ${activeTab === 'scholarships' ? 'Scholarship' : 'College'} Lists`

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f5f6fa', minHeight: '100dvh' }}>
      {/* Header */}
      <header style={{ background: '#0c1b33', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
          <span style={{ color: '#7dd3fc' }}>Soar</span> by LifeLaunchr
        </Link>
        <Link href="/chat" style={{ fontSize: '0.82rem', color: '#8888aa', textDecoration: 'none', border: '1px solid #444466', padding: '4px 12px', borderRadius: 6 }}>
          &larr; Back to Soar
        </Link>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 80px' }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0c1b33', marginBottom: 4 }}>{pageTitle}</h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              {isViewingStudent
                ? `Viewing ${studentName ? `${studentName}'s` : 'this student\'s'} college lists.`
                : 'Soar adds colleges here as you research them. Add and update them manually below.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            {/* View toggle */}
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              {(['spreadsheet', 'card'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '7px 14px', fontSize: '0.8rem', fontWeight: 500,
                    border: 'none', cursor: 'pointer',
                    background: viewMode === mode ? '#4f46e5' : '#fff',
                    color: viewMode === mode ? '#fff' : '#374151',
                  }}
                >
                  {mode === 'spreadsheet' ? 'Spreadsheet' : 'Card View'}
                </button>
              ))}
            </div>
            {/* Add button */}
            {canWrite && accountType !== 'parent' && (
              <button
                onClick={() => activeTab === 'colleges' ? setShowAddModal(true) : setShowAddScholarshipModal(true)}
                style={{ background: activeTab === 'scholarships' ? '#d97706' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {activeTab === 'scholarships' ? '+ Add Scholarship' : '+ Add College'}
              </button>
            )}
          </div>
        </div>

        {/* Counselor/parent banner */}
        {isViewingStudent && (
          <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: '0.875rem', color: '#4338ca' }}>
            {canWrite
              ? `You are viewing ${studentName ? `${studentName}'s` : 'this student\'s'} lists. You can edit on their behalf.`
              : `You are viewing ${studentName ? `${studentName}'s` : 'this student\'s'} lists in read-only mode.`}
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
          {([['colleges', 'Colleges'], ['scholarships', 'Scholarships']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 18px',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: 'none',
                color: activeTab === tab ? '#4f46e5' : '#6b7280',
                borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
                marginBottom: -2,
                transition: 'color 0.15s',
              }}
            >
              {label}
              <span style={{
                marginLeft: 6,
                background: activeTab === tab ? '#eef2ff' : '#f3f4f6',
                color: activeTab === tab ? '#4f46e5' : '#9ca3af',
                borderRadius: 99,
                padding: '1px 7px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}>
                {tab === 'colleges' ? entries.length : scholarships.length}
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'colleges' ? (
          <>
            {/* Entry count summary */}
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: 14 }}>
              {entries.length} college{entries.length !== 1 ? 's' : ''} on this list
              {entries.filter((e) => e.status && e.status !== 'researching').length > 0
                ? ` · ${entries.filter((e) => e.status && e.status !== 'researching').length} applying`
                : ''}
            </p>

            {/* Main view */}
            {viewMode === 'spreadsheet' ? (
              <SpreadsheetView
                entries={entries}
                canWrite={canWrite}
                accountType={accountType}
                onEdit={setEditEntry}
                onDelete={removeCollege}
                onStatusChange={updateStatus}
              />
            ) : (
              <CardView
                entries={entries}
                canWrite={canWrite}
                accountType={accountType}
                onEdit={setEditEntry}
                onDelete={removeCollege}
                onDrop={handleDrop}
              />
            )}
          </>
        ) : (
          <>
            {/* Scholarship count summary */}
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: 14 }}>
              {scholarships.length} scholarship{scholarships.length !== 1 ? 's' : ''} on this list
              {scholarships.filter((e) => e.status === 'awarded').length > 0
                ? ` · ${scholarships.filter((e) => e.status === 'awarded').length} awarded`
                : ''}
            </p>

            {/* Scholarship view */}
            {viewMode === 'spreadsheet' ? (
              <ScholarshipSpreadsheetView
                entries={scholarships}
                canWrite={canWrite}
                onEdit={setEditScholarship}
                onStatusChange={(id, status) => updateScholarship(id, { status })}
              />
            ) : (
              <ScholarshipCardView
                entries={scholarships}
                canWrite={canWrite}
                onEdit={setEditScholarship}
                onStatusChange={(id, status) => updateScholarship(id, { status })}
              />
            )}
          </>
        )}
      </div>

      {/* Add College modal */}
      {showAddModal && (
        <AddCollegeModal
          onClose={() => setShowAddModal(false)}
          onAdd={addCollege}
          apiUrl={apiUrl}
          getToken={getToken}
        />
      )}

      {/* Add Scholarship modal */}
      {showAddScholarshipModal && (
        <AddScholarshipModal
          onClose={() => setShowAddScholarshipModal(false)}
          onAdd={addScholarship}
        />
      )}

      {/* Scholarship edit drawer */}
      {editScholarship && (
        <ScholarshipEditDrawer
          entry={editScholarship}
          canWrite={canWrite}
          onClose={() => setEditScholarship(null)}
          onSave={async (id, updates) => {
            await updateScholarship(id, updates)
            setEditScholarship(null)
          }}
          onDelete={removeScholarship}
        />
      )}

      {/* Edit drawer */}
      {editEntry && (
        <EditDrawer
          entry={editEntry}
          accountType={accountType}
          viewerIsStudent={viewerIsStudent}
          canWrite={canWrite}
          onClose={() => setEditEntry(null)}
          onSave={async (id, updates) => {
            await updateEntry(id, updates)
            setEditEntry(null)
          }}
          apiUrl={apiUrl}
          getToken={getToken}
        />
      )}
    </div>
  )
}

export default function ListsPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af' }}>Loading…</div>}>
      <ListsContent />
    </Suspense>
  )
}
