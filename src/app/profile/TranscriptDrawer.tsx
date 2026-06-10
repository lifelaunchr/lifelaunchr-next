'use client'

import { useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgCategory {
  required: number
  completed: number
  in_progress: number
  satisfied: boolean
  courses?: string[]
  highest_level?: string | null
  algebra2_met?: boolean
  lab_count?: number
  bio?: boolean
  chem?: boolean
  physics?: boolean
  language?: string | null
}

interface TranscriptAnalysis {
  parse_error?: boolean
  error?: string
  raw_response?: string
  student_info?: {
    name?: string | null
    school?: string | null
    graduation_year?: number | null
    current_grade?: string | null
  }
  gpa?: {
    unweighted?: number | null
    weighted_uncapped?: number | null
    weighted_capped?: number | null
    data_quality?: string
    notes?: string
  }
  gpa_by_year?: Record<string, number | null>
  grade_trend?: string
  ag_requirements?: {
    a_history?: AgCategory
    b_english?: AgCategory
    c_math?: AgCategory
    d_science?: AgCategory
    e_language?: AgCategory
    f_arts?: AgCategory
    g_elective?: AgCategory
  }
  preparation_flags?: Array<{
    severity: 'warning' | 'info'
    area: string
    message: string
  }>
}

interface Props {
  analysis: TranscriptAnalysis
  analyzedAt: string | null
  studentName?: string | null
  canWrite: boolean
  uploading: boolean
  reanalyzing: boolean
  onClose: () => void
  onUpload: (file: File) => void
  onReanalyze: () => void
  onDelete: () => void
}

// ── AG requirement rows config ────────────────────────────────────────────────

const AG_ROWS: Array<{ key: keyof NonNullable<TranscriptAnalysis['ag_requirements']>; label: string; required: number; detail?: (cat: AgCategory) => string }> = [
  { key: 'a_history', label: 'A · History / Social Studies', required: 2 },
  { key: 'b_english', label: 'B · English', required: 4 },
  {
    key: 'c_math', label: 'C · Mathematics', required: 3,
    detail: (c) => c.highest_level ? `Highest: ${c.highest_level}${c.algebra2_met ? '' : ' — Algebra II not confirmed'}` : (c.algebra2_met === false ? 'Algebra II not confirmed' : ''),
  },
  {
    key: 'd_science', label: 'D · Lab Science', required: 2,
    detail: (c) => {
      const big3 = [c.bio && 'Bio', c.chem && 'Chem', c.physics && 'Physics'].filter(Boolean)
      return big3.length ? `Big 3 completed: ${big3.join(', ')}` : ''
    },
  },
  {
    key: 'e_language', label: 'E · Language Other Than English', required: 2,
    detail: (c) => c.language ? `Language: ${c.language}` : '',
  },
  { key: 'f_arts', label: 'F · Visual / Performing Arts', required: 1 },
  { key: 'g_elective', label: 'G · College-Prep Elective', required: 1 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 2) {
  if (n == null) return '—'
  return n.toFixed(decimals)
}

function trendBadge(trend?: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    improving:          { label: '↑ Improving', color: '#065f46', bg: '#d1fae5' },
    stable:             { label: '→ Stable',    color: '#1e40af', bg: '#dbeafe' },
    declining:          { label: '↓ Declining', color: '#92400e', bg: '#fef3c7' },
    insufficient_data:  { label: 'Not enough data', color: '#6b7280', bg: '#f3f4f6' },
  }
  const t = map[trend ?? ''] ?? { label: trend ?? 'Unknown', color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{ background: t.bg, color: t.color, borderRadius: 12, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
      {t.label}
    </span>
  )
}

function qualityBadge(quality?: string) {
  const map: Record<string, { label: string; color: string }> = {
    complete:      { label: 'Complete data', color: '#059669' },
    partial:       { label: 'Partial data', color: '#d97706' },
    insufficient:  { label: 'Insufficient data', color: '#dc2626' },
  }
  const q = map[quality ?? ''] ?? { label: quality ?? '', color: '#6b7280' }
  return <span style={{ color: q.color, fontSize: '0.75rem', fontWeight: 600 }}>({q.label})</span>
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TranscriptDrawer({
  analysis, analyzedAt, studentName, canWrite,
  uploading, reanalyzing, onClose, onUpload, onReanalyze, onDelete,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onUpload(f)
    e.target.value = ''
  }

  const isParsed = !analysis.parse_error

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000,
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(560px, 100vw)',
        background: '#fff',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky', top: 0, background: '#fff', zIndex: 10,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0c1b33' }}>
              📄 Transcript Analysis
            </div>
            {analyzedAt && (
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>
                Analyzed {new Date(analyzedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: '#9ca3af', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1 }}>

          {/* Parse error state */}
          {!isParsed && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 6, fontSize: '0.875rem' }}>
                ⚠ Analysis could not be parsed
              </div>
              <div style={{ fontSize: '0.82rem', color: '#7f1d1d' }}>
                {analysis.error || 'The automatic analysis encountered a problem. Try uploading a cleaner copy of the transcript, or re-analyze.'}
              </div>
            </div>
          )}

          {/* Student info */}
          {isParsed && analysis.student_info && (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: '0.82rem', color: '#374151' }}>
              {analysis.student_info.name && <div><strong>Student:</strong> {analysis.student_info.name}</div>}
              {(studentName && !analysis.student_info.name) && <div><strong>Student:</strong> {studentName}</div>}
              {analysis.student_info.school && <div><strong>School:</strong> {analysis.student_info.school}</div>}
              <div style={{ display: 'flex', gap: 16, marginTop: analysis.student_info.name || analysis.student_info.school ? 4 : 0, flexWrap: 'wrap' }}>
                {analysis.student_info.graduation_year && <span><strong>Grad Year:</strong> {analysis.student_info.graduation_year}</span>}
                {analysis.student_info.current_grade && <span><strong>Current Grade:</strong> {analysis.student_info.current_grade}</span>}
              </div>
            </div>
          )}

          {/* GPA Section */}
          {isParsed && analysis.gpa && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#0c1b33' }}>GPA</h3>
                {qualityBadge(analysis.gpa.data_quality)}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', borderRadius: '6px 0 0 6px' }}>Type</th>
                    <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>GPA</th>
                    <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', borderRadius: '0 6px 6px 0', fontSize: '0.72rem' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', color: '#374151' }}>Unweighted</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: analysis.gpa.unweighted != null && analysis.gpa.unweighted >= 3.5 ? '#059669' : analysis.gpa.unweighted != null && analysis.gpa.unweighted < 3.0 ? '#dc2626' : '#374151' }}>
                      {fmt(analysis.gpa.unweighted)}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#9ca3af', fontSize: '0.72rem' }}>10th–12th, A-G only</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', color: '#374151' }}>Weighted (uncapped)</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>
                      {fmt(analysis.gpa.weighted_uncapped)}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#9ca3af', fontSize: '0.72rem' }}>+1 per Honors/AP/IB</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 10px', color: '#374151' }}>Weighted (capped, UC)</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>
                      {fmt(analysis.gpa.weighted_capped)}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#9ca3af', fontSize: '0.72rem' }}>10th–11th, ≤8 bonus sems</td>
                  </tr>
                </tbody>
              </table>
              {analysis.gpa.notes && (
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>{analysis.gpa.notes}</div>
              )}
            </div>
          )}

          {/* GPA by year + trend */}
          {isParsed && (analysis.gpa_by_year || analysis.grade_trend) && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#0c1b33' }}>Grade Trend</h3>
                {trendBadge(analysis.grade_trend)}
              </div>
              {analysis.gpa_by_year && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {(['9', '10', '11', '12'] as const).map((yr) => {
                    const val = analysis.gpa_by_year?.[yr]
                    if (val == null) return null
                    return (
                      <div key={yr} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 60 }}>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>{yr === '9' ? '9th' : yr === '10' ? '10th' : yr === '11' ? '11th' : '12th'}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0c1b33', marginTop: 2 }}>{val.toFixed(2)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* A-G Requirements */}
          {isParsed && analysis.ag_requirements && (
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.875rem', fontWeight: 700, color: '#0c1b33' }}>A-G Requirements</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {AG_ROWS.map(({ key, label, required, detail }) => {
                  const cat = analysis.ag_requirements?.[key]
                  if (!cat) return null
                  const total = (cat.completed ?? 0) + (cat.in_progress ?? 0)
                  const detailText = detail?.(cat)
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px',
                      borderRadius: 8, background: cat.satisfied ? '#f0fdf4' : total > 0 ? '#fffbeb' : '#fef2f2',
                      border: `1px solid ${cat.satisfied ? '#bbf7d0' : total > 0 ? '#fde68a' : '#fecaca'}`,
                    }}>
                      <span style={{ fontSize: '0.9rem', marginTop: 1, flexShrink: 0 }}>
                        {cat.satisfied ? '✅' : cat.in_progress > 0 ? '🔄' : '❌'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 1 }}>
                          {cat.completed} of {required} yrs completed
                          {cat.in_progress > 0 ? ` · ${cat.in_progress} in progress` : ''}
                          {detailText ? ` · ${detailText}` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Preparation flags */}
          {isParsed && analysis.preparation_flags && analysis.preparation_flags.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.875rem', fontWeight: 700, color: '#0c1b33' }}>Flags</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {analysis.preparation_flags.map((flag, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem',
                    background: flag.severity === 'warning' ? '#fffbeb' : '#f0f9ff',
                    border: `1px solid ${flag.severity === 'warning' ? '#fde68a' : '#bae6fd'}`,
                    color: flag.severity === 'warning' ? '#92400e' : '#0c4a6e',
                  }}>
                    <span style={{ flexShrink: 0 }}>{flag.severity === 'warning' ? '⚠' : 'ℹ'}</span>
                    <span>{flag.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No flags message */}
          {isParsed && (!analysis.preparation_flags || analysis.preparation_flags.length === 0) && (
            <div style={{ color: '#059669', fontSize: '0.82rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 22 }}>
              ✅ No preparation flags — looking good!
            </div>
          )}
        </div>

        {/* Footer actions */}
        {canWrite && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex', gap: 10, flexWrap: 'wrap',
            position: 'sticky', bottom: 0, background: '#fff',
          }}>
            <input ref={fileRef} type="file" accept=".pdf,.txt" onChange={handleFileChange} style={{ display: 'none' }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || reanalyzing}
              style={{
                background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 7,
                padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600,
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading || reanalyzing ? 0.6 : 1,
              }}
            >
              {uploading ? 'Uploading…' : '⬆ Upload New'}
            </button>
            <button
              onClick={onReanalyze}
              disabled={uploading || reanalyzing}
              style={{
                background: '#fff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 7,
                padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600,
                cursor: reanalyzing ? 'not-allowed' : 'pointer',
                opacity: uploading || reanalyzing ? 0.6 : 1,
              }}
            >
              {reanalyzing ? 'Re-analyzing…' : '↻ Re-analyze'}
            </button>
            <button
              onClick={onDelete}
              disabled={uploading || reanalyzing}
              style={{
                background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 7,
                padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer',
                opacity: uploading || reanalyzing ? 0.6 : 1,
                marginLeft: 'auto',
              }}
            >
              🗑 Delete
            </button>
          </div>
        )}
      </div>
    </>
  )
}
