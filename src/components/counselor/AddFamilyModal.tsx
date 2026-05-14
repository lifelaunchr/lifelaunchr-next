'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ParentEntry { full_name: string; email: string }
type PersonStatus = 'created' | 'linked' | 'reinvited' | 'reactivated' | 'connected'
interface PersonResult { id: number; status: PersonStatus; invite_url: string | null }
interface FamilyResult {
  student: PersonResult
  parents: PersonResult[]
}
interface CounselorOption { id: number; full_name: string }
interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  counselors?: CounselorOption[]
}

// Map writing section keys to the tenant module that gates them
const WRITING_SECTIONS = [
  { key: 'self_discovery',   title: 'Self-Discovery Journey', module: 'writing_self_discovery' },
  { key: 'writing_practice', title: 'Writing Practice',        module: 'writing_practice'       },
] as const

// Essay module flags: { fieldKey, label, tenantModule }
const ESSAY_FLAGS = [
  { field: 'essay_list_enabled',  label: 'Essay List',                         module: 'essay_list'      },
  { field: 'commonapp_enabled',   label: 'CommonApp Essay',                    module: 'commonapp_essays' },
  { field: 'uc_piqs_enabled',     label: 'UC Personal Insight Questions',      module: 'uc_piqs'          },
  { field: 'why_essays_enabled',  label: 'Why Major / Why College Essays',     module: 'why_essays'       },
] as const

type EssayFlagKey = 'essay_list_enabled' | 'commonapp_enabled' | 'uc_piqs_enabled' | 'why_essays_enabled'

export default function AddFamilyModal({ open, onClose, onSuccess, counselors }: Props) {
  const { getToken } = useAuth()
  const isTenantAdmin = counselors !== undefined && counselors.length > 0
  const [selectedCounselorId, setSelectedCounselorId] = useState<number | null>(
    isTenantAdmin ? counselors[0].id : null
  )

  // ── Tenant modules (fetched once on mount) ────────────────────────────────
  const [tenantModules, setTenantModules] = useState<string[]>([])
  useEffect(() => {
    fetch(API + '/tenant-config')
      .then(r => r.json())
      .then(d => setTenantModules(d.enabled_modules || []))
      .catch(() => {/* non-critical */})
  }, [])

  const hasModule = (key: string) => tenantModules.includes(key)
  const hasAnyEssayModule = ESSAY_FLAGS.some(f => hasModule(f.module)) || hasModule('editate')
  const hasAnyWritingModule = WRITING_SECTIONS.some(s => hasModule(s.module))
  // Only tenant admins (and platform admins/super-admins) can set module access at creation time.
  // Regular counselors skip this section; the student inherits tenant defaults (all flags = null).
  const showAccessSection = isTenantAdmin && (hasAnyEssayModule || hasAnyWritingModule)

  // ── Form state ────────────────────────────────────────────────────────────
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [parents, setParents] = useState<ParentEntry[]>([{ full_name: '', email: '' }])
  const [engagementType, setEngagementType] = useState('')
  const [packageName, setPackageName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [expectedEndDate, setExpectedEndDate] = useState('')
  const [actualEndDate, setActualEndDate] = useState('')
  const [graduationYear, setGraduationYear] = useState('')

  // Module flags: false = denied (default for new students), true = explicitly granted
  const [essayFlags, setEssayFlags] = useState<Record<EssayFlagKey, boolean>>({  // false = denied, true = granted
    essay_list_enabled: false,
    commonapp_enabled:  false,
    uc_piqs_enabled:    false,
    why_essays_enabled: false,
  })

  // Editate
  const [editateEnabled, setEditateEnabled] = useState(false)
  const [editateReviewLimit, setEditateReviewLimit] = useState('')
  const [editateSelectivity, setEditateSelectivity] = useState('')
  const [editateFeedbackPrefs, setEditateFeedbackPrefs] = useState('')

  // Writing section enrollment (post-creation)
  const [writingEnroll, setWritingEnroll] = useState<Record<string, boolean>>({
    self_discovery:   true,
    writing_practice: true,
  })

  // ── Result / UI state ─────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<FamilyResult | null>(null)
  const [resultNames, setResultNames] = useState({ studentName: '', parentNames: [] as string[] })

  const ENGAGEMENT_TYPES = [
    { value: '', label: '— Select —' },
    { value: 'not_a_client_yet', label: 'Not a client yet' },
    { value: 'comprehensive', label: 'Comprehensive' },
    { value: 'stay_on_track', label: 'Stay on Track' },
    { value: 'hourly_on_demand', label: 'Hourly / On Demand' },
    { value: 'test_prep', label: 'Test Prep' },
    { value: 'essay', label: 'Essay' },
  ]

  const reset = () => {
    setStudentName('')
    setStudentEmail('')
    setParents([{ full_name: '', email: '' }])
    setEngagementType('')
    setPackageName('')
    setStartDate('')
    setExpectedEndDate('')
    setActualEndDate('')
    setGraduationYear('')
    setEssayFlags({ essay_list_enabled: false, commonapp_enabled: false, uc_piqs_enabled: false, why_essays_enabled: false })
    setEditateEnabled(false)
    setEditateReviewLimit('')
    setEditateSelectivity('')
    setEditateFeedbackPrefs('')
    setWritingEnroll({ self_discovery: true, writing_practice: true })
    setError('')
    setResult(null)
    setResultNames({ studentName: '', parentNames: [] })
    if (isTenantAdmin && counselors) setSelectedCounselorId(counselors[0].id)
  }

  const addParent = () => {
    if (parents.length < 4) setParents([...parents, { full_name: '', email: '' }])
  }

  const removeParent = (i: number) => setParents(parents.filter((_, j) => j !== i))

  const updateParent = (i: number, f: keyof ParentEntry, v: string) => {
    const u = [...parents]
    u[i] = { ...u[i], [f]: v }
    setParents(u)
  }

  const validate = (): string | null => {
    if (isTenantAdmin && !selectedCounselorId) return 'Please select a counselor'
    if (!studentName.trim()) return 'Student name is required'
    if (!studentEmail.trim()) return 'Student email is required'
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(studentEmail.trim())) return 'Invalid student email format'
    const se = studentEmail.trim().toLowerCase()
    const seen = new Set([se])
    for (const p of parents.filter(x => x.full_name.trim() || x.email.trim())) {
      if (!p.full_name.trim()) return 'Parent name is required when email is provided'
      if (!p.email.trim()) return 'Parent email is required when name is provided'
      if (!re.test(p.email.trim())) return 'Invalid parent email: ' + p.email
      const pe = p.email.trim().toLowerCase()
      if (pe === se) return 'Parent email cannot be the same as student email'
      if (seen.has(pe)) return 'Duplicate email: ' + pe
      seen.add(pe)
    }
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setSubmitting(true)
    try {
      const token = await getToken()
      const fp = parents.filter(p => p.full_name.trim() && p.email.trim())
      const endpoint = isTenantAdmin ? '/tenant-admin/families' : '/counselors/me/families'

      // Build engagement + access fields
      const engagementFields = {
        ...(engagementType                    ? { engagement_type:       engagementType }                   : {}),
        ...(packageName.trim()                ? { coaching_package_name: packageName.trim() }               : {}),
        ...(startDate                         ? { start_date:            startDate }                        : {}),
        ...(expectedEndDate                   ? { expected_end_date:     expectedEndDate }                  : {}),
        ...(actualEndDate                     ? { actual_end_date:       actualEndDate }                    : {}),
        ...(graduationYear.trim()             ? { graduation_year:       parseInt(graduationYear, 10) }     : {}),
        // Editate (only send if module is active for this tenant)
        ...(hasModule('editate') && editateEnabled                   ? { editate_enabled: true }                                    : {}),
        ...(hasModule('editate') && editateReviewLimit.trim()        ? { editate_review_limit: parseInt(editateReviewLimit, 10) }   : {}),
        ...(hasModule('editate') && editateSelectivity               ? { editate_school_selectivity: editateSelectivity }           : {}),
        ...(hasModule('editate') && editateFeedbackPrefs             ? { editate_feedback_preferences: editateFeedbackPrefs }       : {}),
        // Module flags — send true/false based on what the admin set
        ...(hasModule('essay_list')       ? { essay_list_enabled: essayFlags.essay_list_enabled } : {}),
        ...(hasModule('commonapp_essays') ? { commonapp_enabled:  essayFlags.commonapp_enabled  } : {}),
        ...(hasModule('uc_piqs')          ? { uc_piqs_enabled:    essayFlags.uc_piqs_enabled    } : {}),
        ...(hasModule('why_essays')       ? { why_essays_enabled: essayFlags.why_essays_enabled } : {}),
      }

      const body = isTenantAdmin
        ? {
            counselor_id: selectedCounselorId,
            student: { full_name: studentName.trim(), email: studentEmail.trim() },
            parents: fp.map(p => ({ full_name: p.full_name.trim(), email: p.email.trim() })),
            ...engagementFields,
          }
        : {
            student: { full_name: studentName.trim(), email: studentEmail.trim() },
            parents: fp.map(p => ({ full_name: p.full_name.trim(), email: p.email.trim() })),
            ...engagementFields,
          }

      const res = await fetch(API + endpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        const detail = d.detail
        if (detail === 'COUNSELOR_AT_CAPACITY' || detail?.code === 'COUNSELOR_AT_CAPACITY') {
          if (isTenantAdmin && detail?.code === 'COUNSELOR_AT_CAPACITY') {
            const name = counselors?.find(c => c.id === selectedCounselorId)?.full_name || 'This counselor'
            throw new Error(
              `${name} is at their student limit (${detail.active}/${detail.limit}). ` +
              `To add more students, upgrade ${name}'s plan or archive inactive students from their roster.`
            )
          }
          throw new Error("You've reached your student limit. Upgrade your plan or archive inactive students to add more.")
        }
        throw new Error(typeof detail === 'string' ? detail : 'Error ' + res.status)
      }

      const data: FamilyResult = await res.json()

      // ── Writing section enrollment (fire-and-forget after creation) ──────
      const studentId = data.student.id
      const sectionsToEnroll = WRITING_SECTIONS.filter(
        s => hasModule(s.module) && writingEnroll[s.key]
      )
      if (sectionsToEnroll.length > 0) {
        // Best-effort; don't block or fail the modal if enrollment fails
        Promise.all(
          sectionsToEnroll.map(s =>
            fetch(API + '/writing/enroll', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
              body: JSON.stringify({ student_id: studentId, section_key: s.key }),
            })
          )
        ).catch(() => {/* non-critical */})
      }

      setResult(data)
      setResultNames({ studentName: studentName.trim(), parentNames: fp.map(p => p.full_name.trim()) })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddAnother = () => { reset(); onSuccess() }
  const handleDone = () => { reset(); onSuccess(); onClose() }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={result ? handleDone : onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">{result ? 'Family Added' : 'Add a Family'}</h2>
            <button onClick={result ? handleDone : onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>

          {result ? (
            <div>
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-medium ' + (['created','reinvited','reactivated'].includes(result.student.status) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                    {result.student.status === 'connected' || result.student.status === 'linked' ? 'Connected' : 'Invited'}
                  </span>
                  <span className="text-sm text-gray-800">{resultNames.studentName}</span>
                  <span className="text-xs text-gray-400">(student)</span>
                </div>
                {result.parents.map((pr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={'inline-flex px-2 py-0.5 rounded-full text-xs font-medium ' + (['created','reinvited','reactivated'].includes(pr.status) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                      {pr.status === 'connected' || pr.status === 'linked' ? 'Connected' : 'Invited'}
                    </span>
                    <span className="text-sm text-gray-800">{resultNames.parentNames[i]}</span>
                    <span className="text-xs text-gray-400">(parent)</span>
                  </div>
                ))}
              </div>
              {(() => {
                const allPeople = [result.student, ...result.parents]
                const hasInvited = allPeople.some(p => ['created','reinvited','reactivated'].includes(p.status))
                const hasConnected = allPeople.some(p => p.status === 'connected' || p.status === 'linked')
                if (hasInvited && hasConnected) {
                  return <p className="text-sm text-gray-500 mb-5">Invite emails sent to new members. Existing account holders have been connected and notified.</p>
                }
                if (hasInvited) {
                  return <p className="text-sm text-gray-500 mb-5">Invite emails have been sent. Connections will be established automatically when they sign up.</p>
                }
                return <p className="text-sm text-gray-500 mb-5">All accounts were already active. Everyone has been connected and notified.</p>
              })()}

              <div className="flex gap-3">
                <button onClick={handleAddAnother} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">Add Another Family</button>
                <button onClick={handleDone} className="flex-1 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Done</button>
              </div>
            </div>
          ) : (
            <div>
              {error && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

              {/* ── Counselor selector (tenant admin only) ── */}
              {isTenantAdmin && (
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assign to Counselor</label>
                  <select
                    value={selectedCounselorId ?? ''}
                    onChange={e => setSelectedCounselorId(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(counselors ?? []).map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Student ── */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Student</label>
                <div className="space-y-3">
                  <input type="text" placeholder="Full name" value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="email" placeholder="Email address" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* ── Parents ── */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parents / Guardians</label>
                <div className="space-y-3">
                  {parents.map((p, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <input type="text" placeholder="Full name" value={p.full_name} onChange={e => updateParent(idx, 'full_name', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input type="email" placeholder="Email address" value={p.email} onChange={e => updateParent(idx, 'email', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      {parents.length > 1 && <button onClick={() => removeParent(idx)} className="mt-2 text-gray-400 hover:text-red-500 text-sm" title="Remove parent">&times;</button>}
                    </div>
                  ))}
                </div>
                {parents.length < 4 && <button onClick={addParent} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add another parent</button>}
              </div>

              {/* ── Engagement Details ── */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Engagement Details <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Engagement Type</label>
                      <select
                        value={engagementType}
                        onChange={e => setEngagementType(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {ENGAGEMENT_TYPES.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Package Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Diamond Package"
                        value={packageName}
                        onChange={e => setPackageName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Expected End</label>
                      <input
                        type="date"
                        value={expectedEndDate}
                        onChange={e => setExpectedEndDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Actual End</label>
                      <input
                        type="date"
                        value={actualEndDate}
                        onChange={e => setActualEndDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Grad Year</label>
                      <input
                        type="number"
                        placeholder="e.g. 2027"
                        min={2020}
                        max={2035}
                        value={graduationYear}
                        onChange={e => setGraduationYear(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Writing & Essay Access (only shown when tenant has relevant modules) ── */}
              {showAccessSection && (
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Writing &amp; Essay Access <span className="font-normal normal-case text-gray-400">(optional)</span>
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-4">

                    {/* Essay module flags */}
                    {hasAnyEssayModule && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Essay Tools</p>
                        <div className="space-y-1.5">
                          {ESSAY_FLAGS.filter(f => hasModule(f.module)).map(f => (
                            <label key={f.field} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={essayFlags[f.field]}
                                onChange={e => setEssayFlags(prev => ({
                                  ...prev,
                                  [f.field]: e.target.checked,
                                }))}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{f.label}</span>
                            </label>
                          ))}
                          {/* Editate */}
                          {hasModule('editate') && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input
                                  id="add-editate-enabled"
                                  type="checkbox"
                                  checked={editateEnabled}
                                  onChange={e => setEditateEnabled(e.target.checked)}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Enable Editate essay feedback</span>
                              </label>
                              {editateEnabled && (
                                <div className="ml-6 space-y-3">
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Max Feedback Rounds</label>
                                    <input
                                      type="number"
                                      placeholder="e.g. 3"
                                      min={0}
                                      max={99}
                                      value={editateReviewLimit}
                                      onChange={e => setEditateReviewLimit(e.target.value)}
                                      className="w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">College list selectivity</label>
                                    <select
                                      value={editateSelectivity}
                                      onChange={e => setEditateSelectivity(e.target.value)}
                                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">— not set —</option>
                                      <option value="most_selective">Most Selective</option>
                                      <option value="selective">Selective</option>
                                      <option value="less_selective">Less Selective</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Feedback preferences</label>
                                    <select
                                      value={editateFeedbackPrefs}
                                      onChange={e => setEditateFeedbackPrefs(e.target.value)}
                                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">— not set —</option>
                                      <option value="most_open">Open to Rewriting or Major Changes</option>
                                      <option value="open">Open to Some Changes, But Keep the Topic</option>
                                      <option value="somewhat_open">Open to Select Changes</option>
                                      <option value="not_open">Just Polish Essays</option>
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Writing coaching enrollment */}
                    {hasAnyWritingModule && (
                      <div className={hasAnyEssayModule ? 'pt-3 border-t border-gray-200' : ''}>
                        <p className="text-xs font-medium text-gray-600 mb-2">Writing Coaching</p>
                        <p className="text-xs text-gray-400 mb-2">Checked sections will be auto-enrolled when the student is created.</p>
                        <div className="space-y-1.5">
                          {WRITING_SECTIONS.filter(s => hasModule(s.module)).map(s => (
                            <label key={s.key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={writingEnroll[s.key] ?? true}
                                onChange={e => setWritingEnroll(prev => ({ ...prev, [s.key]: e.target.checked }))}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{s.title}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-400">
                      Essay tools are off by default. Check to grant access based on the student&apos;s package.
                      All settings can be adjusted later in the admin panel.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? 'Adding...' : 'Add Family'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
