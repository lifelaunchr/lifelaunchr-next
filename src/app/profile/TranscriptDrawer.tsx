'use client'

import { useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgCategory {
  required: number
  completed: number
  in_progress: number
  satisfied: boolean
  status?: 'on_track' | 'plan_needed' | 'concern'
  courses?: string[]
  highest_level?: string | null
  algebra2_met?: boolean
  lab_count?: number
  bio?: boolean
  chem?: boolean
  physics?: boolean
  language?: string | null
}

interface SubjectProjection {
  subject: string
  status: 'on_track' | 'plan_needed' | 'concern'
  completed_years: number
  projected_years: number
  rigor_observation: string | null
  courses: string[]
}

export interface TranscriptMeta {
  id: number
  institution_name: string | null
  institution_type: string | null
  is_primary: boolean
  file_name: string | null
  file_size_bytes: number | null
  uploaded_at: string | null
}

export interface TranscriptAnalysis {
  parse_error?: boolean
  error?: string
  raw_response?: string
  transcript_type?: 'us_standard' | 'international' | null
  international_narrative?: string | null
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
    overall_unweighted?: number | null
    overall_weighted?: number | null
    school_reported_gpas?: { label: string; value: number | null }[]
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
  subject_projection?: SubjectProjection[]
  preparation_flags?: Array<{
    severity: 'warning' | 'info'
    area: string
    message: string
  }>
  notable_flags?: Array<{
    type: 'honor' | 'class_rank' | 'disciplinary' | 'other'
    description: string
  }>
  name_mismatch?: boolean
}

interface Props {
  analysis: TranscriptAnalysis
  analyzedAt: string | null
  transcripts: TranscriptMeta[]
  studentName?: string | null
  canWrite: boolean
  uploading: boolean
  reanalyzing: boolean
  sameInstitutionWarning?: { existing_id: number; institution_name: string } | null
  onClose: () => void
  onUpload: (file: File) => void
  onReanalyze: (instructions?: string) => void
  onDeleteTranscript: (id: number) => void
  onDismissSameInstitutionWarning: () => void
}

// ── AG requirement rows config ────────────────────────────────────────────────

const AG_ROWS: Array<{
  key: keyof NonNullable<TranscriptAnalysis['ag_requirements']>
  label: string
  required: number
  detail?: (cat: AgCategory) => string
}> = [
  { key: 'a_history', label: 'A · History / Social Studies', required: 2 },
  { key: 'b_english', label: 'B · English', required: 4 },
  {
    key: 'c_math', label: 'C · Mathematics', required: 3,
    detail: (c) =>
      c.highest_level
        ? `Highest: ${c.highest_level}${c.algebra2_met ? '' : ' — Algebra II not confirmed'}`
        : c.algebra2_met === false ? 'Algebra II not confirmed' : '',
  },
  {
    key: 'd_science', label: 'D · Lab Science', required: 2,
    detail: (c) => {
      const big3 = [c.bio && 'Bio', c.chem && 'Chem', c.physics && 'Physics'].filter(Boolean)
      return big3.length ? `Big 3: ${big3.join(', ')}` : ''
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
    improving:         { label: '↑ Improving',      color: '#065f46', bg: '#d1fae5' },
    stable:            { label: '→ Stable',          color: '#1e40af', bg: '#dbeafe' },
    declining:         { label: '↓ Declining',       color: '#92400e', bg: '#fef3c7' },
    insufficient_data: { label: 'Not enough data',   color: '#6b7280', bg: '#f3f4f6' },
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
    complete:     { label: 'Complete data',     color: '#059669' },
    partial:      { label: 'Partial data',      color: '#d97706' },
    insufficient: { label: 'Insufficient data', color: '#dc2626' },
  }
  const q = map[quality ?? ''] ?? { label: quality ?? '', color: '#6b7280' }
  return <span style={{ color: q.color, fontSize: '0.75rem', fontWeight: 600 }}>({q.label})</span>
}

function instTypeBadge(type: string | null) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    high_school:       { label: 'High School',   bg: '#dbeafe', color: '#1e40af' },
    community_college: { label: 'Comm. College', bg: '#d1fae5', color: '#065f46' },
    online:            { label: 'Online',         bg: '#f3e8ff', color: '#7c3aed' },
    other:             { label: 'Other',          bg: '#f3f4f6', color: '#6b7280' },
  }
  const b = map[type ?? ''] ?? { label: type ?? 'Unknown', bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{ background: b.bg, color: b.color, borderRadius: 10, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 600 }}>
      {b.label}
    </span>
  )
}

// ── Status chip with tooltip ──────────────────────────────────────────────────

const STATUS_COPY: Record<string, { label: string; color: string; bg: string; border: string; tip: string }> = {
  on_track: {
    label: 'On track',
    color: '#065f46', bg: '#d1fae5', border: '#6ee7b7',
    tip: 'Based on courses completed and current grade level, the student is projected to finish the standard sequence by graduation.',
  },
  plan_needed: {
    label: 'Plan needed',
    color: '#92400e', bg: '#fef3c7', border: '#fde68a',
    tip: 'The student will fall short of the standard sequence unless specific courses are intentionally scheduled. There is still time to address this.',
  },
  concern: {
    label: 'Concern',
    color: '#991b1b', bg: '#fef2f2', border: '#fecaca',
    tip: 'The student is significantly behind in this subject with limited time remaining. Discuss options with the counselor as soon as possible.',
  },
}

function StatusChip({ status }: { status: string }) {
  const [show, setShow] = useState(false)
  const s = STATUS_COPY[status] ?? { label: status, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', tip: '' }
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          background: s.bg, color: s.color, border: `1px solid ${s.border}`,
          borderRadius: 10, padding: '2px 9px', fontSize: '0.73rem', fontWeight: 600,
          cursor: 'default', userSelect: 'none',
        }}
      >
        {s.label} <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>ⓘ</span>
      </span>
      {show && s.tip && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
          background: '#1e293b', color: '#f8fafc', borderRadius: 8,
          padding: '8px 12px', fontSize: '0.75rem', lineHeight: 1.5,
          width: 240, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
        }}>
          {s.tip}
        </div>
      )}
    </span>
  )
}

// ── Collapsible course list ───────────────────────────────────────────────────

function CourseList({ courses }: { courses: string[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!courses.length) return null
  const shown = expanded ? courses : courses.slice(0, 3)
  return (
    <div style={{ marginTop: 4 }}>
      {shown.map((c, i) => (
        <span key={i} style={{
          display: 'inline-block', background: '#f1f5f9', borderRadius: 6,
          padding: '1px 7px', fontSize: '0.68rem', color: '#475569',
          marginRight: 4, marginBottom: 3,
        }}>
          {c}
        </span>
      ))}
      {courses.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.7rem', cursor: 'pointer', padding: '1px 0' }}
        >
          {expanded ? 'show less' : `+${courses.length - 3} more`}
        </button>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TranscriptDrawer({
  analysis, analyzedAt, transcripts, studentName, canWrite,
  uploading, reanalyzing, sameInstitutionWarning,
  onClose, onUpload, onReanalyze, onDeleteTranscript, onDismissSameInstitutionWarning,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [reanalyzeInstructions, setReanalyzeInstructions] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onUpload(f)
    e.target.value = ''
  }

  const isParsed = !analysis.parse_error
  const isInternational = analysis.transcript_type === 'international'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000 }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(580px, 100vw)',
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

          {/* Same-institution warning */}
          {sameInstitutionWarning && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: '0.82rem', color: '#92400e' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠ Possible duplicate institution</div>
              <div>You already have a transcript from <strong>{sameInstitutionWarning.institution_name}</strong>. For the same school, the most recent transcript usually contains all prior coursework. Both are kept — the analysis combines them. You can delete the older one if it&rsquo;s redundant.</div>
              <button onClick={onDismissSameInstitutionWarning} style={{ marginTop: 8, background: 'none', border: 'none', color: '#92400e', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}>
                Dismiss
              </button>
            </div>
          )}

          {/* Uploaded transcripts list */}
          {transcripts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Uploaded Transcripts
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {transcripts.map((t) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                    padding: '8px 12px',
                  }}>
                    <span style={{ fontSize: '1rem' }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0c1b33', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {t.institution_name || t.file_name || 'Transcript'}
                        {instTypeBadge(t.institution_type)}
                        {t.is_primary && (
                          <span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 10, padding: '1px 7px', fontSize: '0.68rem', fontWeight: 600 }}>Primary</span>
                        )}
                      </div>
                      {t.uploaded_at && (
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 1 }}>
                          Uploaded {new Date(t.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                    {canWrite && (
                      confirmDeleteId === t.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem' }}>
                          <span style={{ color: '#dc2626' }}>Delete?</span>
                          <button
                            onClick={() => { onDeleteTranscript(t.id); setConfirmDeleteId(null) }}
                            style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280' }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(t.id)}
                          title="Delete this transcript"
                          style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: '0.9rem', padding: '2px 4px', lineHeight: 1 }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}
                        >
                          🗑
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
              {canWrite && (
                <div style={{ marginTop: 8 }}>
                  <input ref={fileRef} type="file" accept=".pdf,.txt" onChange={handleFileChange} style={{ display: 'none' }} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || reanalyzing}
                    style={{
                      background: 'none', color: '#6366f1',
                      border: '1px dashed #c7d2fe', borderRadius: 7,
                      padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600,
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      opacity: uploading || reanalyzing ? 0.6 : 1,
                    }}
                  >
                    {uploading ? '⏳ Uploading…' : '+ Add another transcript'}
                  </button>
                </div>
              )}
            </div>
          )}

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

          {/* International narrative */}
          {isParsed && isInternational && analysis.international_narrative && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0c4a6e', marginBottom: 6 }}>
                🌐 International Transcript
              </div>
              <div style={{ fontSize: '0.82rem', color: '#0c4a6e', lineHeight: 1.55 }}>
                {analysis.international_narrative}
              </div>
            </div>
          )}

          {/* Student info */}
          {isParsed && analysis.student_info && (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: '0.82rem', color: '#374151' }}>
              {analysis.student_info.name && <div><strong>Student:</strong> {analysis.student_info.name}</div>}
              {studentName && !analysis.student_info.name && <div><strong>Student:</strong> {studentName}</div>}
              {analysis.student_info.school && <div><strong>School:</strong> {analysis.student_info.school}</div>}
              <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                {analysis.student_info.graduation_year && <span><strong>Grad:</strong> {analysis.student_info.graduation_year}</span>}
                {analysis.student_info.current_grade && <span><strong>Grade:</strong> {analysis.student_info.current_grade}</span>}
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

              {/* School-reported GPA(s) — transcribed verbatim from the transcript with the school's own labels; the numbers families recognize */}
              {Array.isArray(analysis.gpa.school_reported_gpas) && analysis.gpa.school_reported_gpas.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                    School-Reported
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <tbody>
                      {analysis.gpa.school_reported_gpas.map((g, i) => (
                        <tr key={i} style={{ borderBottom: i < (analysis.gpa?.school_reported_gpas?.length ?? 0) - 1 ? '1px solid #f1f5f9' : undefined }}>
                          <td style={{ padding: '7px 10px', color: '#374151' }}>{g.label}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>
                            {fmt(g.value)}
                          </td>
                          <td style={{ padding: '7px 10px', color: '#9ca3af', fontSize: '0.72rem' }}>As printed on the transcript</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 4, fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1.4, fontStyle: 'italic' }}>
                    The school&rsquo;s official GPA(s), exactly as printed. Our computed figures below may differ — they exclude PE/health, and the UC/CSU figures use UC&rsquo;s A-G, whole-letter methodology.
                  </div>
                </div>
              )}

              {/* Overall GPA */}
              {(analysis.gpa.overall_unweighted != null || analysis.gpa.overall_weighted != null) && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                    Overall (All Courses)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 10px', color: '#374151' }}>Unweighted</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: analysis.gpa.overall_unweighted != null && analysis.gpa.overall_unweighted >= 3.5 ? '#059669' : analysis.gpa.overall_unweighted != null && analysis.gpa.overall_unweighted < 3.0 ? '#dc2626' : '#374151' }}>
                          {fmt(analysis.gpa.overall_unweighted)}
                        </td>
                        <td style={{ padding: '7px 10px', color: '#9ca3af', fontSize: '0.72rem' }}>Grades 9–12, excl. PE/health</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '7px 10px', color: '#374151' }}>Weighted</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>
                          {fmt(analysis.gpa.overall_weighted)}
                        </td>
                        <td style={{ padding: '7px 10px', color: '#9ca3af', fontSize: '0.72rem' }}>+1 per Honors/AP/IB/CC</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* UC GPA */}
              {(analysis.gpa.unweighted != null || analysis.gpa.weighted_uncapped != null || analysis.gpa.weighted_capped != null) && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                    UC / CSU GPA
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 10px', color: '#374151' }}>Unweighted</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: analysis.gpa.unweighted != null && analysis.gpa.unweighted >= 3.5 ? '#059669' : analysis.gpa.unweighted != null && analysis.gpa.unweighted < 3.0 ? '#dc2626' : '#374151' }}>
                          {fmt(analysis.gpa.unweighted)}
                        </td>
                        <td style={{ padding: '7px 10px', color: '#9ca3af', fontSize: '0.72rem' }}>10th–12th, A-G only</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 10px', color: '#374151' }}>Weighted (uncapped)</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>
                          {fmt(analysis.gpa.weighted_uncapped)}
                        </td>
                        <td style={{ padding: '7px 10px', color: '#9ca3af', fontSize: '0.72rem' }}>+1 per Honors/AP/IB/CC</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '7px 10px', color: '#374151' }}>Weighted (capped)</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>
                          {fmt(analysis.gpa.weighted_capped)}
                        </td>
                        <td style={{ padding: '7px 10px', color: '#9ca3af', fontSize: '0.72rem' }}>10th–11th, ≤8 bonus sems</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {analysis.gpa.notes && (
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>{analysis.gpa.notes}</div>
              )}
              <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#9ca3af', lineHeight: 1.4 }}>
                ℹ️ Calculated from extracted course data. UC and CSU verify using the{' '}
                <a href="https://hs-articulation.ucop.edu/agcourselist" target="_blank" rel="noopener noreferrer"
                   style={{ color: '#6366f1', textDecoration: 'underline' }}>UCOP A-G course list</a>
                {' '}— treat this as guidance, not an official figure.
              </div>
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

          {/* ── Core Subject Overview ─────────────────────────────────────── */}
          {isParsed && analysis.subject_projection && analysis.subject_projection.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.875rem', fontWeight: 700, color: '#0c1b33' }}>Core Subject Overview</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {analysis.subject_projection.map((proj) => (
                  <div key={proj.subject} style={{
                    borderRadius: 8, border: '1px solid #e2e8f0',
                    padding: '9px 12px',
                    background: proj.status === 'concern' ? '#fef2f2' : proj.status === 'plan_needed' ? '#fffbeb' : '#f0fdf4',
                    borderColor: proj.status === 'concern' ? '#fecaca' : proj.status === 'plan_needed' ? '#fde68a' : '#bbf7d0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#0c1b33' }}>{proj.subject}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {proj.completed_years} / {proj.projected_years} yr{proj.projected_years !== 1 ? 's' : ''} projected
                        </span>
                        <StatusChip status={proj.status} />
                      </div>
                    </div>
                    {proj.rigor_observation && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                        {proj.rigor_observation}
                      </div>
                    )}
                    {proj.courses && proj.courses.length > 0 && (
                      <CourseList courses={proj.courses} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── UC/CSU A-G Requirements (California) ─────────────────────── */}
          {isParsed && analysis.ag_requirements && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#0c1b33' }}>UC/CSU A-G Requirements</h3>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>(California)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {AG_ROWS.map(({ key, label, required, detail }) => {
                  const cat = analysis.ag_requirements?.[key]
                  if (!cat) return null
                  // Use backend-computed status (grade-level-aware) when available;
                  // fall back to legacy satisfied/in-progress inference for old analyses.
                  const agStatus: 'on_track' | 'plan_needed' | 'concern' =
                    cat.status ?? (cat.satisfied ? 'on_track' : (cat.in_progress > 0 ? 'plan_needed' : 'concern'))
                  const detailText = detail?.(cat)
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px',
                      borderRadius: 8,
                      background: agStatus === 'on_track' ? '#f0fdf4' : agStatus === 'plan_needed' ? '#fffbeb' : '#fef2f2',
                      border: `1px solid ${agStatus === 'on_track' ? '#bbf7d0' : agStatus === 'plan_needed' ? '#fde68a' : '#fecaca'}`,
                    }}>
                      <span style={{ fontSize: '0.9rem', marginTop: 1, flexShrink: 0 }}>
                        {agStatus === 'on_track' ? '✅' : agStatus === 'plan_needed' ? '⚠️' : '❌'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 1 }}>
                          {cat.completed} of {required} yrs completed
                          {cat.in_progress > 0 ? ` · ${cat.in_progress} in progress` : ''}
                          {detailText ? ` · ${detailText}` : ''}
                        </div>
                        {cat.courses && cat.courses.length > 0 && (
                          <CourseList courses={cat.courses} />
                        )}
                        {key === 'g_elective' && (
                          <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 4, fontStyle: 'italic' }}>
                            Extra years beyond the minimum in any a–f subject also satisfy this requirement.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notable flags (class rank, honors, disciplinary) */}
          {isParsed && analysis.notable_flags && analysis.notable_flags.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.875rem', fontWeight: 700, color: '#0c1b33' }}>Notable</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {analysis.notable_flags.map((flag, i) => {
                  const isDisc = flag.type === 'class_rank'
                  const isDisciplinary = flag.type === 'disciplinary'
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem',
                      background: isDisciplinary ? '#fef2f2' : isDisc ? '#f0f9ff' : '#faf5ff',
                      border: `1px solid ${isDisciplinary ? '#fecaca' : isDisc ? '#bae6fd' : '#e9d5ff'}`,
                      color: isDisciplinary ? '#991b1b' : isDisc ? '#0c4a6e' : '#6b21a8',
                    }}>
                      <span style={{ flexShrink: 0 }}>
                        {flag.type === 'honor' ? '★' : flag.type === 'class_rank' ? '#' : flag.type === 'disciplinary' ? '⚠' : '•'}
                      </span>
                      <span>{flag.description}</span>
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
            padding: '16px 24px', borderTop: '1px solid #e2e8f0',
            position: 'sticky', bottom: 0, background: '#fff',
          }}>
            {showInstructions && (
              <div style={{ marginBottom: 12 }}>
                <textarea
                  value={reanalyzeInstructions}
                  onChange={e => setReanalyzeInstructions(e.target.value)}
                  placeholder={'e.g. "Precalculus Honors (Apex Learn) is a full year — the school uses 10 credits per year." or "Geometry Jr High is on the HS transcript and should count."'}
                  rows={3}
                  style={{
                    width: '100%', fontSize: '0.78rem', border: '1px solid #c7d2fe',
                    borderRadius: 6, padding: '8px 10px', resize: 'vertical',
                    fontFamily: 'inherit', color: '#374151', boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 4 }}>
                  These instructions are passed to the AI for this re-analysis only — they are not saved.
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => {
                  onReanalyze(reanalyzeInstructions.trim() || undefined)
                  setShowInstructions(false)
                  setReanalyzeInstructions('')
                }}
                disabled={uploading || reanalyzing}
                style={{
                  background: '#fff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 7,
                  padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600,
                  cursor: reanalyzing ? 'not-allowed' : 'pointer',
                  opacity: uploading || reanalyzing ? 0.6 : 1,
                }}
              >
                {reanalyzing ? 'Re-analyzing…' : '↻ Re-analyze all'}
              </button>
              <button
                onClick={() => setShowInstructions(v => !v)}
                disabled={uploading || reanalyzing}
                style={{
                  background: 'none', border: 'none', color: '#6b7280', fontSize: '0.75rem',
                  cursor: 'pointer', padding: '4px 0', textDecoration: 'underline',
                }}
              >
                {showInstructions ? 'Hide instructions' : '+ Add instructions'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
